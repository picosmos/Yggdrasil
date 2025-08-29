namespace Odin.Middleware;

public partial class LoggingMiddleware(RequestDelegate next, ILogger<LoggingMiddleware> logger)
{
    private readonly RequestDelegate _next = next;
    private readonly ILogger<LoggingMiddleware> _logger = logger;

    [LoggerMessage(
        EventId = 1,
        Level = LogLevel.Error,
        Message = "An unhandled exception occurred while processing the request from {RemoteIp}")]
    private static partial void LogUnhandledException(ILogger logger, string? remoteIp, Exception exception);

    [LoggerMessage(
        EventId = 2,
        Level = LogLevel.Information,
        Message = "Response {StatusCode} for {Method} {Path} from {RemoteIp}")]
    private static partial void LogResponseInfo(ILogger logger, int statusCode, string method, string path, System.Net.IPAddress? remoteIp);

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await this._next(context);
        }
        catch (Exception ex)
        {
            LogUnhandledException(this._logger, context.Connection.RemoteIpAddress?.ToString(), ex);
            context.Response.StatusCode = 500;
            await context.Response.CompleteAsync();
            return;
        }
        finally
        {
            LogResponseInfo(
                this._logger,
                context.Response.StatusCode,
                context.Request.Method,
                context.Request.Path,
                context.Connection.RemoteIpAddress
            );
        }
    }
}
