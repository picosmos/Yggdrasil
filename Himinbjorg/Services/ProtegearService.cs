using System.Globalization;

namespace Himinbjorg.Services;

public sealed class ProtegearService(ILogger<ProtegearService> logger, CachedRequestService cachedRequestService) : IDisposable
{
    private readonly ILogger<ProtegearService> _logger = logger;
    private readonly HttpClient httpClient = new();
    private readonly CachedRequestService _cachedRequestService = cachedRequestService;

    public string Request(string imei, string apiSecret, DateTime from, DateTime to)
    {
        var fromStr = from.ToString("yyyy-MM-ddTHH:mm:ssZ", CultureInfo.InvariantCulture);
        var toStr = to.ToString("yyyy-MM-ddTHH:mm:ssZ", CultureInfo.InvariantCulture);
        var apiUrl = $"https://protegear.io/protegear/api/v1/device/{imei}/events?from={Uri.EscapeDataString(fromStr)}&until={Uri.EscapeDataString(toStr)}";

        var cached = this._cachedRequestService.GetCached(apiUrl);
        if (cached != null && cached.LastRequestTimestamp > DateTime.UtcNow.AddMinutes(-5))
        {
            this._logger.LogInformation("Returning cached response for {ApiUrl}", apiUrl);
            return cached.ResponseText;
        }

        this._logger.LogInformation("Fetching data from {ApiUrl}", apiUrl);
        var request = new HttpRequestMessage(HttpMethod.Get, apiUrl);
        request.Headers.Add("X-GST-Token", apiSecret);

        try
        {
            var response = this.httpClient.SendAsync(request).Result;
            response.EnsureSuccessStatusCode();
            var json = response.Content.ReadAsStringAsync().Result;
            this._cachedRequestService.AddOrReplaceCacheEntry(apiUrl, json);
            return json;
        }
        catch (Exception ex)
        {
            this._logger.LogError(ex, "Error fetching Protegear data");
            return string.Empty;
        }
    }

    public void Dispose()
    {
        this.httpClient.Dispose();
        GC.SuppressFinalize(this);
    }
}