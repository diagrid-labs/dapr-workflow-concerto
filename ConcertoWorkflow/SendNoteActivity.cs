using System;
using Microsoft.Extensions.Logging;
using Dapr.Workflow;

public sealed partial class SendNoteActivity(ILogger<SendNoteActivity> logger, HttpClient httpClient)
    : WorkflowActivity<SendNoteInput, bool>
{
    public override async Task<bool> RunAsync(WorkflowActivityContext context, SendNoteInput input)
    {
        if (input.Bpm <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(input.Bpm), "BPM must be positive.");
        }

        var note = input.Note;
        var wholeMs = (60000d / input.Bpm) * 4d;

        var noteLengthValue = FractionParser.ParseToValue(note.NoteLength);
        var intervalValue = FractionParser.ParseToValue(note.Interval);

        var idealDurationMs = (int)(wholeMs * noteLengthValue);
        var idealWaitMs = (int)(wholeMs * intervalValue);
        var actualWaitMs = Math.Max(0, idealWaitMs - input.OverheadMs);

        LogNoteSend(logger, note.NoteName, idealDurationMs, actualWaitMs);

        await Task.Delay(actualWaitMs);

        var playback = new PlaybackNote(
            note.Id,
            note.NoteName,
            note.Type,
            idealDurationMs,
            actualWaitMs);

        var response = await httpClient.PostAsJsonAsync("/sendnote", playback);
        return response.IsSuccessStatusCode;
    }

    [LoggerMessage(LogLevel.Information, "SendNoteActivity: {NoteName} (duration={DurationMs}ms, wait={WaitMs}ms)")]
    partial void LogNoteSend(ILogger logger, string NoteName, int DurationMs, int WaitMs);
}
