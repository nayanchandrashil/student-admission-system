namespace SchoolAdmission.Api.Dtos;
 
public class CreateClassRequest
{
    public string? Name { get; set; }
    public int TotalSeats { get; set; }
}
 
public record CreateClassResponse(string Id, string Name, int TotalSeats);
 
public record ClassResponse(
    string Id,
    string Name,
    int TotalSeats,
    int HeldSeats,
    int ConfirmedSeats,
    int AvailableSeats);
 