using System.ComponentModel.DataAnnotations;

namespace SseWorkflow.Models;

public record EventInput(
    [Required] string Id,
    [Required] DateTime Timestamp,
    [Required] string Type,
    [Required] string Message
);
