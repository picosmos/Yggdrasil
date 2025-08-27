
using Microsoft.EntityFrameworkCore;
using Edda;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<EddaDbContext>(options =>
	options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

var app = builder.Build();

app.MapGet("/", () => "Hello World!");

app.Run();
