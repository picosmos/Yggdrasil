using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Mimir.Mimir.Migrations;

/// <inheritdoc />
public partial class InitialCreate : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "Tracks",
            columns: table => new
            {
                Id = table.Column<long>(type: "INTEGER", nullable: false)
                    .Annotation("Sqlite:Autoincrement", true),
                UserId = table.Column<long>(type: "INTEGER", nullable: false),
                From = table.Column<DateTime>(type: "TEXT", nullable: false),
                To = table.Column<DateTime>(type: "TEXT", nullable: false),
                Secret = table.Column<string>(type: "TEXT", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Tracks", x => x.Id);
            });

        migrationBuilder.CreateTable(
            name: "Users",
            columns: table => new
            {
                Id = table.Column<long>(type: "INTEGER", nullable: false)
                    .Annotation("Sqlite:Autoincrement", true),
                Name = table.Column<string>(type: "TEXT", nullable: false),
                ProtegearApiSecret = table.Column<string>(type: "TEXT", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Users", x => x.Id);
            });
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(
            name: "Tracks");

        migrationBuilder.DropTable(
            name: "Users");
    }
}
