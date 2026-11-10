using System.Text.RegularExpressions;
 
namespace SchoolAdmission.Api.Common;
 
public static class StudentIdHeader
{
    public const string Name = "X-Student-Id";
 
    private static readonly Regex Pattern = new("^[0-9]{17}$", RegexOptions.Compiled);
 
    public static bool TryGet(HttpRequest request, out string studentId, out string error)
    {
        studentId = string.Empty;
        error = string.Empty;
 
        if (!request.Headers.TryGetValue(Name, out var values) ||
            string.IsNullOrWhiteSpace(values.ToString()))
        {
            error = "X-Student-Id header is required.";
            return false;
        }
 
        var value = values.ToString().Trim();
        if (!Pattern.IsMatch(value))
        {
            error = "X-Student-Id must be exactly 17 digits.";
            return false;
        }
 
        studentId = value;
        return true;
    }
}