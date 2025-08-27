using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using System;
using System.Text;
using System.Threading.Tasks;

namespace Odin.Middleware
{
    public class BasicAuthMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<BasicAuthMiddleware> _logger;
        private static readonly string USERNAME = Environment.GetEnvironmentVariable("BASIC_AUTH_USERNAME") ?? "admin";
        private static readonly string PASSWORD = Environment.GetEnvironmentVariable("BASIC_AUTH_PASSWORD") ?? "password";

        public BasicAuthMiddleware(RequestDelegate next, ILogger<BasicAuthMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            if (!context.Request.Headers.ContainsKey("Authorization"))
            {
                _logger.LogWarning("Authorization header missing. Denying request from {RemoteIp}", context.Connection.RemoteIpAddress);
                context.Response.Headers["WWW-Authenticate"] = "Basic realm=\"Protected Area\"";
                context.Response.StatusCode = 401;
                await context.Response.CompleteAsync();
                return;
            }

            var authHeader = context.Request.Headers["Authorization"].ToString();
            if (!authHeader.StartsWith("Basic "))
            {
                _logger.LogWarning("Authorization header does not start with 'Basic '. Denying request from {RemoteIp}", context.Connection.RemoteIpAddress);
                context.Response.Headers["WWW-Authenticate"] = "Basic realm=\"Protected Area\"";
                context.Response.StatusCode = 401;
                await context.Response.CompleteAsync();
                return;
            }

            var encodedCredentials = authHeader.Substring("Basic ".Length).Trim();

            try
            {
                var credentialBytes = Convert.FromBase64String(encodedCredentials);
                var credentials = Encoding.UTF8.GetString(credentialBytes).Split(':', 2);
                if (credentials.Length == 2 && credentials[0] == USERNAME && credentials[1] == PASSWORD)
                {
                    _logger.LogInformation("Basic authentication succeeded for user '{Username}' from {RemoteIp}", credentials[0], context.Connection.RemoteIpAddress);
                    await _next(context);
                    return;
                }
                else
                {
                    _logger.LogWarning("Basic authentication failed for user '{Username}' from {RemoteIp}", credentials.Length > 0 ? credentials[0] : "<unknown>", context.Connection.RemoteIpAddress);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Exception occurred while decoding Basic Auth credentials from {RemoteIp}", context.Connection.RemoteIpAddress);
            }

            context.Response.Headers["WWW-Authenticate"] = "Basic realm=\"Protected Area\"";
            context.Response.StatusCode = 401;
            await context.Response.CompleteAsync();
        }
    }
}
