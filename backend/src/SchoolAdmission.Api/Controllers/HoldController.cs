using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolAdmission.Api.Common;
using SchoolAdmission.Api.Data;
using SchoolAdmission.Api.Dtos;
using SchoolAdmission.Api.Models;
 
namespace SchoolAdmission.Api.Controllers;
 
[ApiController]
public class HoldsController(AppDbContext db, IConfiguration config) : ControllerBase
{
    private int HoldDurationSeconds
    {
        get
        {
            var value = config.GetValue<int?>("HOLD_DURATION_SECONDS");
            return value is > 0 ? value.Value : 600;
        }
    }
 
    private static DateTime TruncateToSeconds(DateTime value) =>
        new(value.Ticks - value.Ticks % TimeSpan.TicksPerSecond, DateTimeKind.Utc);
 
    [HttpPost("classes/{classId}/holds")]
    public async Task<IActionResult> CreateHold(string classId)
    {
        if (!StudentIdHeader.TryGet(Request, out var studentId, out var error))
    return BadRequest(new { message = error });
 
        await using var tx = await db.Database.BeginTransactionAsync();
 
        var cls = (await db.Classes
            .FromSqlInterpolated($"SELECT * FROM \"Classes\" WHERE \"Id\" = {classId} FOR UPDATE")
            .ToListAsync()).FirstOrDefault();
 
        if (cls is null)
            return NotFound(new { message = "Class not found." });
 
        var now = DateTime.UtcNow;
 
        await db.Holds
            .Where(h => h.ClassId == classId
                        && h.Status == HoldStatus.HELD
                        && h.ExpiresAt <= now)
            .ExecuteUpdateAsync(s => s.SetProperty(h => h.Status, HoldStatus.EXPIRED));
 
        var activeCount = await db.Holds.CountAsync(h =>
            h.ClassId == classId &&
            ((h.Status == HoldStatus.HELD && h.ExpiresAt > now) ||
             h.Status == HoldStatus.CONFIRMED));
 
        if (activeCount >= cls.TotalSeats)
            return Conflict(new { message = "No seats available in this class." });
 
        var alreadyApplied = await db.Holds.AnyAsync(h =>
            h.ClassId == classId &&
            h.StudentId == studentId &&
            ((h.Status == HoldStatus.HELD && h.ExpiresAt > now) ||
             h.Status == HoldStatus.CONFIRMED));
 
        if (alreadyApplied)
            return Conflict(new { message = "You already have an active application for this class." });
 
        var createdAt = TruncateToSeconds(now);
        var hold = new Hold
        {
            Id = IdGenerator.NewHoldId(),
            ClassId = classId,
            StudentId = studentId,
            Status = HoldStatus.HELD,
            CreatedAt = createdAt,
            ExpiresAt = createdAt.AddSeconds(HoldDurationSeconds)
        };
 
        db.Holds.Add(hold);
        await db.SaveChangesAsync();
        await tx.CommitAsync();
 
        return Created($"/holds/{hold.Id}", new HoldCreatedResponse(
            hold.Id, hold.ClassId, hold.StudentId, hold.Status.ToString(), hold.ExpiresAt));
    }
}