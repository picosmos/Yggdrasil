using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Mimir.Mimir.Migrations;

/// <inheritdoc />
public partial class CachedRequests : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "CachedRequests",
            columns: table => new
            {
                Id = table.Column<long>(type: "INTEGER", nullable: false)
                    .Annotation("Sqlite:Autoincrement", true),
                RequestUrl = table.Column<string>(type: "TEXT", nullable: false),
                ResponseText = table.Column<string>(type: "TEXT", nullable: false),
                LastRequestTimestamp = table.Column<DateTime>(type: "TEXT", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_CachedRequests", x => x.Id);
            });
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(
            name: "CachedRequests");
    }
}
