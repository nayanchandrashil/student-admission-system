namespace SchoolAdmission.Api.Common;
 
public static class IdGenerator
{
    public static string NewClassId() => "c_" + Guid.CreateVersion7().ToString("N");
    public static string NewHoldId() => "h_" + Guid.CreateVersion7().ToString("N");
}