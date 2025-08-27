using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using System;
using System.Threading.Tasks;

namespace Odin.Middleware
{
    public class LoggingMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<LoggingMiddleware> _logger;

        public LoggingMiddleware(RequestDelegate next, ILogger<LoggingMiddleware> logger)
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
                _logger.LogError(ex, "An unhandled exception occurred while processing the request from {RemoteIp}", context.Connection.RemoteIpAddress);
                context.Response.StatusCode = 500;
                await context.Response.CompleteAsync();
                return;
            }
            finally
            {
                _logger.LogInformation("Response {StatusCode} for {Method} {Path} from {RemoteIp}",
                    context.Response.StatusCode,
                    context.Request.Method,
                    context.Request.Path,
                    context.Connection.RemoteIpAddress);
            }
        }
    }
}
