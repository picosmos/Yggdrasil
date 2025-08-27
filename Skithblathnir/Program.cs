using Microsoft.EntityFrameworkCore;
using Mimir;
using Odin;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<MimirDbContext>(options =>
	options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddControllersWithViews();


var app = builder.Build();

app.RegisterOdinAuth();
app.Use(async (context, next) =>
{
	if (context.Request.Path == "/")
	{
		context.Request.Path = "/index.html";
	}
	await next();
});
app.UseStaticFiles();
app.UseRouting();
app.RegisterOdinRoutes();

app.Run();
