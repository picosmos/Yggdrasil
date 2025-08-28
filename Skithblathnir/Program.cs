using Microsoft.EntityFrameworkCore;
using Mimir;
using Odin;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<MimirDbContext>(options =>
	options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.RegisterOdinServices();
builder.Services.AddControllersWithViews();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
	var db = scope.ServiceProvider.GetRequiredService<MimirDbContext>();
	db.Database.Migrate();
}

app.RegisterOdinAuth();
app.Use(async (context, next) =>
{
	if (context.Request.Path == "/")
	{
		context.Request.Path = "/index.html";
	}
	
	await next();
});
app.RegisterOdinRoutes();
app.UseStaticFiles();
app.UseRouting();

app.Run();
