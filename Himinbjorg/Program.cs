using Microsoft.EntityFrameworkCore;
using Edda;
using Odin;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<EddaDbContext>(options =>
	options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddControllersWithViews();


var app = builder.Build();

app.RegisterOdinAuth();
app.UseStaticFiles();
app.UseRouting();
app.RegisterOdinRoutes();

app.Run();
