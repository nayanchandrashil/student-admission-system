using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Testcontainers.PostgreSql;
 
namespace SchoolAdmission.Tests;
 
public record ClassDto(string Id, string Name, int TotalSeats, int HeldSeats, int ConfirmedSeats, int AvailableSeats);
public record HoldDto(string HoldId, string ClassId, string StudentId, string Status, DateTime ExpiresAt);
public record HoldStatusDto(string HoldId, string ClassId, string Status, DateTime ExpiresAt);
 
public sealed class TestApp : IAsyncDisposable
{
    private readonly PostgreSqlContainer _db;
    private readonly WebApplicationFactory<Program> _factory;
 
    public HttpClient Client { get; }
 
    private TestApp(PostgreSqlContainer db, WebApplicationFactory<Program> factory)
    {
        _db = db;
        _factory = factory;
        Client = factory.CreateClient();
    }
 
    public static async Task<TestApp> StartAsync(int holdSeconds = 600)
    {
        var db = new PostgreSqlBuilder().WithImage("postgres:16").Build();
        await db.StartAsync();
 
        Environment.SetEnvironmentVariable("ConnectionStrings__Default", db.GetConnectionString());
        Environment.SetEnvironmentVariable("HOLD_DURATION_SECONDS", holdSeconds.ToString());
 
        var factory = new WebApplicationFactory<Program>()
            .WithWebHostBuilder(b => b.UseEnvironment("Testing"));
 
        return new TestApp(db, factory);
    }
 
    public static string StudentId(int n) => (20150000000000000L + n).ToString();
 
    public async Task<ClassDto> CreateClassAsync(string name, int totalSeats)
    {
        var res = await Client.PostAsJsonAsync("/classes", new { name, totalSeats });
        res.EnsureSuccessStatusCode();
        return (await res.Content.ReadFromJsonAsync<ClassDto>())!;
    }
 
    public async Task<ClassDto> GetClassAsync(string classId) =>
        (await Client.GetFromJsonAsync<ClassDto>($"/classes/{classId}"))!;
 
    public Task<HttpResponseMessage> SendAsync(HttpMethod method, string url, string? studentId = null)
    {
        var request = new HttpRequestMessage(method, url);
        if (studentId is not null)
            request.Headers.Add("X-Student-Id", studentId);
        return Client.SendAsync(request);
    }
 
    public Task<HttpResponseMessage> ApplyAsync(string classId, string studentId) =>
        SendAsync(HttpMethod.Post, $"/classes/{classId}/holds", studentId);
 
    public Task<HttpResponseMessage> ConfirmAsync(string holdId, string studentId) =>
        SendAsync(HttpMethod.Post, $"/holds/{holdId}/confirm", studentId);
 
    public Task<HttpResponseMessage> CancelAsync(string holdId, string studentId) =>
        SendAsync(HttpMethod.Delete, $"/holds/{holdId}", studentId);
 
    public async Task<HoldDto> ApplyOkAsync(string classId, string studentId)
    {
        var res = await ApplyAsync(classId, studentId);
        res.EnsureSuccessStatusCode();
        return (await res.Content.ReadFromJsonAsync<HoldDto>())!;
    }
 
    public async Task<HoldStatusDto> GetHoldAsync(string holdId) =>
        (await Client.GetFromJsonAsync<HoldStatusDto>($"/holds/{holdId}"))!;
 
    public async ValueTask DisposeAsync()
    {
        Client.Dispose();
        await _factory.DisposeAsync();
        await _db.DisposeAsync();
    }
}