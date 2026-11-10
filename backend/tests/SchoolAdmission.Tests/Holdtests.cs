using System.Net;
using Xunit;
 
[assembly: CollectionBehavior(DisableTestParallelization = true)]
 
namespace SchoolAdmission.Tests;
 
public class HoldTests
{
    [Fact]
    public async Task Fifty_students_compete_for_five_seats_exactly_five_win()
    {
        await using var app = await TestApp.StartAsync();
        var cls = await app.CreateClassAsync("Concurrency Class", 5);
 
        var tasks = Enumerable.Range(1, 50)
            .Select(i => Task.Run(() => app.ApplyAsync(cls.Id, TestApp.StudentId(i))))
            .ToList();
 
        var responses = await Task.WhenAll(tasks);
 
        Assert.Equal(5, responses.Count(r => r.StatusCode == HttpStatusCode.Created));
        Assert.Equal(45, responses.Count(r => r.StatusCode == HttpStatusCode.Conflict));
        Assert.DoesNotContain(responses, r => (int)r.StatusCode >= 500);
 
        var after = await app.GetClassAsync(cls.Id);
        Assert.Equal(5, after.HeldSeats);
        Assert.Equal(0, after.ConfirmedSeats);
        Assert.Equal(0, after.AvailableSeats);
    }
 
    [Fact]
    public async Task Same_student_cannot_apply_twice_to_same_class()
    {
        await using var app = await TestApp.StartAsync();
        var cls = await app.CreateClassAsync("Duplicate Class", 10);
        var student = TestApp.StudentId(1);
 
        var first = await app.ApplyAsync(cls.Id, student);
        var second = await app.ApplyAsync(cls.Id, student);
 
        Assert.Equal(HttpStatusCode.Created, first.StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, second.StatusCode);
    }
 
    [Fact]
    public async Task Confirming_twice_counts_the_seat_only_once()
    {
        await using var app = await TestApp.StartAsync();
        var cls = await app.CreateClassAsync("Confirm Class", 3);
        var student = TestApp.StudentId(1);
        var hold = await app.ApplyOkAsync(cls.Id, student);
 
        var first = await app.ConfirmAsync(hold.HoldId, student);
        var second = await app.ConfirmAsync(hold.HoldId, student);
 
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        Assert.Equal(HttpStatusCode.OK, second.StatusCode);
 
        var after = await app.GetClassAsync(cls.Id);
        Assert.Equal(1, after.ConfirmedSeats);
        Assert.Equal(0, after.HeldSeats);
        Assert.Equal(2, after.AvailableSeats);
    }
 
    [Fact]
    public async Task Expired_hold_cannot_be_confirmed_and_seat_returns()
    {
        await using var app = await TestApp.StartAsync(holdSeconds: 1);
        var cls = await app.CreateClassAsync("Expiry Class", 1);
        var student = TestApp.StudentId(1);
        var hold = await app.ApplyOkAsync(cls.Id, student);
 
        Assert.Equal(0, (await app.GetClassAsync(cls.Id)).AvailableSeats);
 
        await Task.Delay(TimeSpan.FromSeconds(2.5));
 
        var confirm = await app.ConfirmAsync(hold.HoldId, student);
        Assert.Equal(HttpStatusCode.Conflict, confirm.StatusCode);
 
        Assert.Equal("EXPIRED", (await app.GetHoldAsync(hold.HoldId)).Status);
        Assert.Equal(1, (await app.GetClassAsync(cls.Id)).AvailableSeats);
    }
 
    [Fact]
    public async Task Cancelling_a_hold_returns_the_seat()
    {
        await using var app = await TestApp.StartAsync();
        var cls = await app.CreateClassAsync("Cancel Class", 1);
        var student = TestApp.StudentId(1);
        var hold = await app.ApplyOkAsync(cls.Id, student);
 
        Assert.Equal(0, (await app.GetClassAsync(cls.Id)).AvailableSeats);
 
        var cancel = await app.CancelAsync(hold.HoldId, student);
        Assert.Equal(HttpStatusCode.NoContent, cancel.StatusCode);
 
        Assert.Equal("CANCELLED", (await app.GetHoldAsync(hold.HoldId)).Status);
        Assert.Equal(1, (await app.GetClassAsync(cls.Id)).AvailableSeats);
    }
 
    [Fact]
    public async Task Student_cannot_confirm_someone_elses_hold()
    {
        await using var app = await TestApp.StartAsync();
        var cls = await app.CreateClassAsync("Ownership Class", 2);
        var owner = TestApp.StudentId(1);
        var stranger = TestApp.StudentId(2);
        var hold = await app.ApplyOkAsync(cls.Id, owner);
 
        var response = await app.ConfirmAsync(hold.HoldId, stranger);
 
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal("HELD", (await app.GetHoldAsync(hold.HoldId)).Status);
    }
}