using Microsoft.EntityFrameworkCore;
using Edda;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<EddaDbContext>(options =>
	options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddControllersWithViews();

var app = builder.Build();

app.UseStaticFiles();
app.UseRouting();

app.MapControllerRoute(
	name: "areas",
	pattern: "odin/{controller=Home}/{action=Index}/{id?}");

app.Run();
