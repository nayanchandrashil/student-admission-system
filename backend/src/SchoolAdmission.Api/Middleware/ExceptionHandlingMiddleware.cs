using System.Text.Json;

namespace SchoolAdmission.Api.Middleware;

public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            // If the response has already started, we can no longer change it.
            if (context.Response.HasStarted)
            {
                throw;
            }

            int status;
            string message;

            switch (ex)
            {
                case BadHttpRequestException bad:
                    status = bad.StatusCode;
                    message = "Invalid request.";
                    break;
                case JsonException:
                    status = StatusCodes.Status400BadRequest;
                    message = "Invalid request body.";
                    break;
                default:
                    _logger.LogError(ex, "Unhandled exception");
                    status = StatusCodes.Status500InternalServerError;
                    message = "Something went wrong on the server.";
                    break;
            }

            context.Response.StatusCode = status;
            await context.Response.WriteAsJsonAsync(new { message });
        }
    }
}