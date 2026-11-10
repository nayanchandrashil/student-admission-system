namespace SchoolAdmission.Api.Dtos;
 
public record HoldCreatedResponse(
    string HoldId,
    string ClassId,
    string StudentId,
    string Status,
    DateTime ExpiresAt);
 
    public record HoldStatusResponse(
    string HoldId,
    string ClassId,
    string Status,
    DateTime ExpiresAt);
 
    public record MyHoldResponse(
    string HoldId,
    string ClassId,
    string ClassName,
    string Status,
    DateTime ExpiresAt);
 
public record HoldConfirmedResponse(string HoldId, string Status);