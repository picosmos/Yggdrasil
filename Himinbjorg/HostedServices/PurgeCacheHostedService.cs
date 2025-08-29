
using Microsoft.EntityFrameworkCore;
using Mimir;

namespace Himinbjorg.HostedServices;

public class PurgeCacheHostedService(ILogger<PurgeCacheHostedService> logger, IServiceProvider serviceProvider) : IHostedService
{
    private readonly ILogger<PurgeCacheHostedService> _logger = logger;
    private readonly IServiceProvider _serviceProvider = serviceProvider;
    private CancellationTokenSource? _internalCts;
    private Task? _backgroundTask;

    public Task StartAsync(CancellationToken cancellationToken)
    {
        {
            this._internalCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            this._backgroundTask = Task.Run(() => this.RunDailyAsync(this._internalCts.Token), cancellationToken);
            return Task.CompletedTask;
        }
    }

    public async Task StopAsync(CancellationToken cancellationToken)
    {
        this._internalCts?.Cancel();
        if (this._backgroundTask is not null)
        {
            try
            {
                await this._backgroundTask;
            }
            catch (OperationCanceledException) { }
        }
    }

    private async Task RunDailyAsync(CancellationToken cancellationToken)
    {
        while (!cancellationToken.IsCancellationRequested)
        {
            try
            {
                await this.PurgeCacheAsync(cancellationToken);
            }
            catch (Exception ex)
            {
                this._logger.LogError(ex, "Error during cache purge");
            }

            try
            {
                await Task.Delay(TimeSpan.FromDays(1), cancellationToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }
    }

    private async Task PurgeCacheAsync(CancellationToken cancellationToken)
    {
        this._logger.LogInformation("Starting cache purge...");
        using (var scope = this._serviceProvider.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<MimirDbContext>();
            await dbContext.CachedRequests
                .Where(c => c.LastRequestTimestamp < DateTime.UtcNow.AddMonths(-1)).ExecuteDeleteAsync(cancellationToken);
        }
        this._logger.LogInformation("Cache purge completed.");
    }
}
