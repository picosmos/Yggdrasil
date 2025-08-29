
using Mimir;
using Mimir.Models;

namespace Himinbjorg.Services
{
    public class ProtegearService
    {
        private readonly ILogger<ProtegearService> _logger;
        private readonly HttpClient httpClient = new();
        private readonly CachedRequestService _cachedRequestService;

        public ProtegearService(ILogger<ProtegearService> logger, CachedRequestService cachedRequestService)
        {
            _logger = logger;
            _cachedRequestService = cachedRequestService;
        }

        public string Request(string imei, string apiSecret, DateTime from, DateTime to)
        {
            var fromStr = from.ToString("yyyy-MM-ddTHH:mm:ssZ");
            var toStr = to.ToString("yyyy-MM-ddTHH:mm:ssZ");
            var apiUrl = $"https://protegear.io/protegear/api/v1/device/{imei}/events?from={Uri.EscapeDataString(fromStr)}&until={Uri.EscapeDataString(toStr)}";

            var cached = this._cachedRequestService.GetCached(apiUrl);
            if (cached != null && cached.LastRequestTimestamp > DateTime.UtcNow.AddMinutes(-5))
            {
                _logger.LogInformation($"Returning cached response for {apiUrl}");
                return cached.ResponseText;
            }

            this._logger.LogInformation($"Fetching data from {apiUrl}");
            var request = new HttpRequestMessage(HttpMethod.Get, apiUrl);
            request.Headers.Add("X-GST-Token", apiSecret);

            try
            {
                var response = httpClient.SendAsync(request).Result;
                response.EnsureSuccessStatusCode();
                var json = response.Content.ReadAsStringAsync().Result;
                this._cachedRequestService.AddToCache(apiUrl, json);
                return json;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching Protegear data");
                return string.Empty;
            }
        }
    }
}