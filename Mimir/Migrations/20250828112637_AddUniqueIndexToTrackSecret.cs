using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Mimir.Mimir.Migrations
{
    /// <inheritdoc />
    public partial class AddUniqueIndexToTrackSecret : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_Tracks_Secret",
                table: "Tracks",
                column: "Secret",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Tracks_Secret",
                table: "Tracks");
        }
    }
}
