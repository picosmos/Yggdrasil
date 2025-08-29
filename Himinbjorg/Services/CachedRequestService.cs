using Microsoft.EntityFrameworkCore;
using Mimir;
using Mimir.Models;

namespace Himinbjorg.Services;

public class CachedRequestService(ILogger<CachedRequestService> logger, MimirDbContext mimirDbContext)
{
    private readonly MimirDbContext _mimirDbContext = mimirDbContext;
    private readonly ILogger<CachedRequestService> _logger = logger;

    public CachedRequest? GetCached(string url)
    {
        var cached = this._mimirDbContext.CachedRequests.FirstOrDefault(cr => cr.RequestUrl == url);
        if (cached != null)
        {
            this._logger.LogInformation("Cache hit for URL: {Url}", url);
        }
        else
        {
            this._logger.LogInformation("Cache miss for URL: {Url}", url);
        }
        return cached;
    }

    public void AddOrReplaceCacheEntry(string url, string response)
    {
        this._mimirDbContext.CachedRequests.Where(x => x.RequestUrl == url).ExecuteDelete();

        var cachedRequest = new CachedRequest
        {
            RequestUrl = url,
            ResponseText = response,
            LastRequestTimestamp = DateTime.UtcNow
        };

        this._mimirDbContext.CachedRequests.Add(cachedRequest);
        this._mimirDbContext.SaveChanges();
        this._logger.LogInformation("Added response to cache for URL: {Url}", url);
    }
}