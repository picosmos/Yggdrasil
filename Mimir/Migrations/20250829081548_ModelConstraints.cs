using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Mimir.Mimir.Migrations;

/// <inheritdoc />
public partial class ModelConstraints : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateIndex(
            name: "IX_Users_Name",
            table: "Users",
            column: "Name",
            unique: true);

        migrationBuilder.CreateIndex(
            name: "IX_CachedRequests_RequestUrl",
            table: "CachedRequests",
            column: "RequestUrl",
            unique: true);
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropIndex(
            name: "IX_Users_Name",
            table: "Users");

        migrationBuilder.DropIndex(
            name: "IX_CachedRequests_RequestUrl",
            table: "CachedRequests");
    }
}
