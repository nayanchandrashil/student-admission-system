namespace SchoolAdmission.Api.Dtos;
 
public record HoldCreatedResponse(
    string HoldId,
    string ClassId,
    string StudentId,
    string Status,
    DateTime ExpiresAt);