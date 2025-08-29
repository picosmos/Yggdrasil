using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Mimir.Mimir.Migrations;

/// <inheritdoc />
public partial class TrackToUserNavigationProperty : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateIndex(
            name: "IX_Tracks_UserId",
            table: "Tracks",
            column: "UserId");

        migrationBuilder.AddForeignKey(
            name: "FK_Tracks_Users_UserId",
            table: "Tracks",
            column: "UserId",
            principalTable: "Users",
            principalColumn: "Id",
            onDelete: ReferentialAction.Cascade);
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropForeignKey(
            name: "FK_Tracks_Users_UserId",
            table: "Tracks");

        migrationBuilder.DropIndex(
            name: "IX_Tracks_UserId",
            table: "Tracks");
    }
}
