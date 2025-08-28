
using Mimir;
using Mimir.Models;

namespace Himinbjorg.Services
{
    public class ProtegearService
    {
        private readonly ILogger<ProtegearService> _logger;
        private readonly HttpClient httpClient = new();

        public ProtegearService(ILogger<ProtegearService> logger)
        {
            _logger = logger;
        }

        public string Request(string imei, string apiSecret, DateTime from, DateTime to)
        {
            var fromStr = from.ToString("yyyy-MM-ddTHH:mm:ssZ");
            var toStr = to.ToString("yyyy-MM-ddTHH:mm:ssZ");
            var apiUrl = $"https://protegear.io/protegear/api/v1/device/{imei}/events?from={Uri.EscapeDataString(fromStr)}&until={Uri.EscapeDataString(toStr)}";

            this._logger.LogInformation($"Fetching data from {apiUrl}");
            var request = new HttpRequestMessage(HttpMethod.Get, apiUrl);
            request.Headers.Add("X-GST-Token", apiSecret);

            try
            {
                var response = httpClient.SendAsync(request).Result;
                response.EnsureSuccessStatusCode();
                var json = response.Content.ReadAsStringAsync().Result;
                // Assuming Track can be deserialized from the JSON response
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