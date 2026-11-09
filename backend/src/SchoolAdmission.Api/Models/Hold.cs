namespace SchoolAdmission.Api.Models;

public class Hold
{
    public string Id { get; set; } = default;
    public string ClassId { get; set; } = default;
    public Class? Class { get; set; }
    public string StudentId { get; set; } = default;
    public HoldStatus Status { get; set; } 
    public DateTime CreatedAt { get; set; } 
    public DateTime ExpiresAt { get; set; }
}