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
 
    [HttpGet("holds/{holdId}")]
    public async Task<IActionResult> GetHold(string holdId)
    {
        var hold = await db.Holds.AsNoTracking().FirstOrDefaultAsync(h => h.Id == holdId);
 
        if (hold is null)
            return NotFound(new { message = "Hold not found." });
 
        var status = hold.Status == HoldStatus.HELD && hold.ExpiresAt <= DateTime.UtcNow
            ? HoldStatus.EXPIRED
            : hold.Status;
 
        return Ok(new HoldStatusResponse(hold.Id, hold.ClassId, status.ToString(), hold.ExpiresAt));
    }
 
    [HttpPost("holds/{holdId}/confirm")]
    public async Task<IActionResult> Confirm(string holdId)
    {
        if (!StudentIdHeader.TryGet(Request, out var studentId, out var error))
            return BadRequest(new { message = error });
 
        var now = DateTime.UtcNow;
 
        var updated = await db.Holds
            .Where(h => h.Id == holdId
                        && h.StudentId == studentId
                        && h.Status == HoldStatus.HELD
                        && h.ExpiresAt > now)
            .ExecuteUpdateAsync(s => s.SetProperty(h => h.Status, HoldStatus.CONFIRMED));
 
        if (updated == 1)
            return Ok(new HoldConfirmedResponse(holdId, HoldStatus.CONFIRMED.ToString()));
 
        var hold = await db.Holds.AsNoTracking().FirstOrDefaultAsync(h => h.Id == holdId);
 
        if (hold is null)
            return NotFound(new { message = "Hold not found." });
 
        if (hold.StudentId != studentId)
            return StatusCode(StatusCodes.Status403Forbidden,
                new { message = "This hold belongs to another student." });
 
        if (hold.Status == HoldStatus.CONFIRMED)
            return Ok(new HoldConfirmedResponse(holdId, HoldStatus.CONFIRMED.ToString()));
 
        return Conflict(new { message = "This hold has expired or was cancelled." });
    }
 
    [HttpDelete("holds/{holdId}")]
    public async Task<IActionResult> Cancel(string holdId)
    {
        if (!StudentIdHeader.TryGet(Request, out var studentId, out var error))
            return BadRequest(new { message = error });
 
        var now = DateTime.UtcNow;
 
        var updated = await db.Holds
            .Where(h => h.Id == holdId
                        && h.StudentId == studentId
                        && h.Status == HoldStatus.HELD
                        && h.ExpiresAt > now)
            .ExecuteUpdateAsync(s => s.SetProperty(h => h.Status, HoldStatus.CANCELLED));
 
        if (updated == 1)
            return NoContent();
 
        var hold = await db.Holds.AsNoTracking().FirstOrDefaultAsync(h => h.Id == holdId);
 
        if (hold is null)
            return NotFound(new { message = "Hold not found." });
 
        if (hold.StudentId != studentId)
            return StatusCode(StatusCodes.Status403Forbidden,
                new { message = "This hold belongs to another student." });
 
        if (hold.Status == HoldStatus.CONFIRMED)
            return Conflict(new { message = "A confirmed application cannot be cancelled." });
 
        return Conflict(new { message = "This hold has already expired or was cancelled." });
    }
 
    [HttpGet("me/holds")]
    public async Task<IActionResult> MyHolds()
    {
        if (!StudentIdHeader.TryGet(Request, out var studentId, out var error))
            return BadRequest(new { message = error });
 
        var now = DateTime.UtcNow;
 
        var rows = await db.Holds
            .AsNoTracking()
            .Where(h => h.StudentId == studentId)
            .OrderByDescending(h => h.CreatedAt)
            .ThenByDescending(h => h.Id)
            .Select(h => new
            {
                h.Id,
                h.ClassId,
                ClassName = h.Class!.Name,
                h.Status,
                h.ExpiresAt
            })
            .ToListAsync();
 
        var result = rows
            .Select(r => new MyHoldResponse(
                r.Id,
                r.ClassId,
                r.ClassName,
                (r.Status == HoldStatus.HELD && r.ExpiresAt <= now
                    ? HoldStatus.EXPIRED
                    : r.Status).ToString(),
                r.ExpiresAt))
            .ToList();
 
        return Ok(result);
    }
}
