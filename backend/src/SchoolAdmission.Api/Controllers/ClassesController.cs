using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolAdmission.Api.Common;
using SchoolAdmission.Api.Data;
using SchoolAdmission.Api.Dtos;
using SchoolAdmission.Api.Models;
 
namespace SchoolAdmission.Api.Controllers;
 
[ApiController]
[Route("classes")]
public class ClassesController(AppDbContext db) : ControllerBase
{
    // API #1: POST /classes
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateClassRequest request)
    {
        var name = request.Name?.Trim();
 
        if (string.IsNullOrEmpty(name))
            return BadRequest(new { message = "Class name is required." });
 
        if (name.Length > 200)
            return BadRequest(new { message = "Class name must be 200 characters or fewer." });
 
        if (request.TotalSeats <= 0)
            return BadRequest(new { message = "totalSeats must be greater than 0." });
 
        var cls = new Class
        {
            Id = IdGenerator.NewClassId(),
            Name = name,
            TotalSeats = request.TotalSeats
        };
 
        db.Classes.Add(cls);
        await db.SaveChangesAsync();
 
        return Created($"/classes/{cls.Id}", new CreateClassResponse(cls.Id, cls.Name, cls.TotalSeats));
    }
 
    // API #2: GET /classes
    [HttpGet]
    public async Task<ActionResult<List<ClassResponse>>> List()
    {
        var result = await ToResponsesAsync(db.Classes);
        return Ok(result);
    }
 
    [HttpGet("{classId}")]
    public async Task<IActionResult> GetById(string classId)
    {
        var result = await ToResponsesAsync(db.Classes.Where(c => c.Id == classId));
        var item = result.FirstOrDefault();
 
        if (item is null)
            return NotFound(new { message = "Class not found." });
 
        return Ok(item);
    }
 
    // Seat গোনা: counter column নেই, Holds table থেকে গুনে বের করা হয়
    private async Task<List<ClassResponse>> ToResponsesAsync(IQueryable<Class> source)
    {
        var now = DateTime.UtcNow;
 
        var rows = await source
            .AsNoTracking()
            .OrderBy(c => c.Name)
            .ThenBy(c => c.Id)
            .Select(c => new
            {
                c.Id,
                c.Name,
                c.TotalSeats,
                Held = db.Holds.Count(h =>
                    h.ClassId == c.Id &&
                    h.Status == HoldStatus.HELD &&
                    h.ExpiresAt > now),
                Confirmed = db.Holds.Count(h =>
                    h.ClassId == c.Id &&
                    h.Status == HoldStatus.CONFIRMED)
            })
            .ToListAsync();
 
        return rows
            .Select(r => new ClassResponse(
                r.Id, r.Name, r.TotalSeats,
                r.Held, r.Confirmed,
                r.TotalSeats - r.Held - r.Confirmed))
            .ToList();
    }
}