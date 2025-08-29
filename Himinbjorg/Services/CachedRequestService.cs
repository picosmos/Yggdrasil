using Mimir;
using Mimir.Models;

namespace Himinbjorg.Services;

public class CachedRequestService(ILogger<CachedRequestService> logger, MimirDbContext mimirDbContext)
{
    private readonly MimirDbContext _mimirDbContext = mimirDbContext;
    private readonly ILogger<CachedRequestService> _logger = logger;

    public CachedRequest? GetCached(string url)
    {
        var cached = _mimirDbContext.CachedRequests.FirstOrDefault(cr => cr.RequestUrl == url);
        if (cached != null)
        {
            _logger.LogInformation($"Cache hit for URL: {url}");
        }
        else
        {
            _logger.LogInformation($"Cache miss for URL: {url}");
        }
        return cached;
    }

    public void AddToCache(string url, string response)
    {
        var cachedRequest = new CachedRequest
        {
            RequestUrl = url,
            ResponseText = response,
            LastRequestTimestamp = DateTime.UtcNow
        };

        _mimirDbContext.CachedRequests.Add(cachedRequest);
        _mimirDbContext.SaveChanges();
        _logger.LogInformation($"Added response to cache for URL: {url}");
    }
}