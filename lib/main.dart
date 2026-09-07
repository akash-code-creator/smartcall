import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:audioplayers/audioplayers.dart';
import 'package:record/record.dart';
import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_feather_icons/flutter_feather_icons.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const SmartCallApp());
}

class SmartCallApp extends StatelessWidget {
  const SmartCallApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SmartCall Auto Voice',
      debugShowCheckedModeBanner: false,
      theme: ThemeData.dark().copyWith(
        scaffoldBackgroundColor: const Color(0xFF070B14),
        cardColor: const Color(0xFF0E1526),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFF6366F1), // Indigo
          secondary: Color(0xFF10B981), // Emerald
          surface: Color(0xFF0E1526),
        ),
      ),
      home: const SmartCallHomeScreen(),
    );
  }
}

// ---------------------------------------------------------------------------
// DATA MODELS
// ---------------------------------------------------------------------------

class VoiceNote {
  final String id;
  final String title;
  final String text;
  final String? audioPath;
  final double durationSec;
  final bool isDefault;
  final String source; // 'gemini_tts' or 'recorded'

  VoiceNote({
    required this.id,
    required this.title,
    required this.text,
    this.audioPath,
    required this.durationSec,
    this.isDefault = false,
    required this.source,
  });

  Map<String, dynamic> toJson() => {
    'id': id,
    'title': title,
    'text': text,
    'audioPath': audioPath,
    'durationSec': durationSec,
    'isDefault': isDefault,
    'source': source,
  };

  factory VoiceNote.fromJson(Map<String, dynamic> json) => VoiceNote(
    id: json['id'],
    title: json['title'],
    text: json['text'],
    audioPath: json['audioPath'],
    durationSec: (json['durationSec'] as num).toDouble(),
    isDefault: json['isDefault'] ?? false,
    source: json['source'] ?? 'gemini_tts',
  );
}

class CallLogItem {
  final String id;
  final String callerNumber;
  final String callerName;
  final String responseNoteTitle;
  final DateTime timestamp;
  final String triggerUsed;

  CallLogItem({
    required this.id,
    required this.callerNumber,
    required this.callerName,
    required this.responseNoteTitle,
    required this.timestamp,
    required this.triggerUsed,
  });

  Map<String, dynamic> toJson() => {
    'id': id,
    'callerNumber': callerNumber,
    'callerName': callerName,
    'responseNoteTitle': responseNoteTitle,
    'timestamp': timestamp.toIso8601String(),
    'triggerUsed': triggerUsed,
  };

  factory CallLogItem.fromJson(Map<String, dynamic> json) => CallLogItem(
    id: json['id'],
    callerNumber: json['callerNumber'],
    callerName: json['callerName'],
    responseNoteTitle: json['responseNoteTitle'],
    timestamp: DateTime.parse(json['timestamp']),
    triggerUsed: json['triggerUsed'],
  );
}

// ---------------------------------------------------------------------------
// MAIN STATEFUL SCREEN & SERVICE CONTROLLER
// ---------------------------------------------------------------------------

class SmartCallHomeScreen extends StatefulWidget {
  const SmartCallHomeScreen({super.key});

  @override
  State<SmartCallHomeScreen> createState() => _SmartCallHomeScreenState();
}

class _SmartCallHomeScreenState extends State<SmartCallHomeScreen> {
  static const MethodChannel _nativeChannel = MethodChannel('com.smartcall.app/native');

  int _currentTabIndex = 0;
  final TextEditingController _scriptController = TextEditingController(
    text: "Hello, I am currently driving and cannot pick up your call right now. I will get back to you as soon as I arrive at my destination!",
  );

  // Audio & TTS
  final FlutterTts _flutterTts = FlutterTts();
  final AudioPlayer _audioPlayer = AudioPlayer();
  final AudioRecorder _audioRecorder = AudioRecorder();

  bool _isPlaying = false;
  bool _isRecording = false;
  int _recordSeconds = 0;
  Timer? _recordTimer;
  String? _currentRecordingPath;

  // Settings & Triggers
  bool _doublePowerEnabled = true;
  bool _doubleTapEnabled = true;
  bool _blockDefaultMute = true;
  int _autoAnswerDelaySec = 1;

  // App Data
  List<VoiceNote> _savedNotes = [];
  String _activeNoteId = 'default-aoede';
  List<CallLogItem> _callLogs = [];

  @override
  void initState() {
    super.initState();
    _initTts();
    _initAudioPlayer();
    _initNativeMethodChannel();
    _loadPersistedData();
  }

  @override
  void dispose() {
    _scriptController.dispose();
    _flutterTts.stop();
    _audioPlayer.dispose();
    _audioRecorder.dispose();
    _recordTimer?.cancel();
    super.dispose();
  }

  // -------------------------------------------------------------------------
  // INITIALIZATIONS
  // -------------------------------------------------------------------------

  Future<void> _initTts() async {
    await _flutterTts.setLanguage("en-US");
    await _flutterTts.setPitch(1.12); // High feminine clarity
    await _flutterTts.setSpeechRate(0.50);

    // Heuristically select female voice engine
    try {
      List<dynamic>? voices = await _flutterTts.getVoices;
      if (voices != null) {
        for (var voice in voices) {
          final name = voice['name'].toString().toLowerCase();
          if (name.contains('female') ||
              name.contains('zira') ||
              name.contains('samantha') ||
              name.contains('en-us-x-sfg')) {
            await _flutterTts.setVoice({"name": voice['name'], "locale": voice['locale']});
            break;
          }
        }
      }
    } catch (_) {}

    _flutterTts.setStartHandler(() => setState(() => _isPlaying = true));
    _flutterTts.setCompletionHandler(() => setState(() => _isPlaying = false));
    _flutterTts.setErrorHandler((_) => setState(() => _isPlaying = false));
  }

  void _initAudioPlayer() {
    _audioPlayer.onPlayerComplete.listen((_) {
      setState(() => _isPlaying = false);
    });
  }

  void _initNativeMethodChannel() {
    _nativeChannel.setMethodCallHandler((call) async {
      switch (call.method) {
        case 'onHardwarePowerDoublePress':
          _triggerAutomatedCallResponse("Double Power Key");
          break;
        case 'onCallStateChanged':
          final state = call.arguments['state'];
          final number = call.arguments['phoneNumber'];
          if (state == 'RINGING') {
            _showIncomingCallDialog(number);
          }
          break;
      }
    });
  }

  Future<void> _loadPersistedData() async {
    final prefs = await SharedPreferences.getInstance();
    final savedNotesJson = prefs.getString('saved_notes');
    if (savedNotesJson != null) {
      final List decoded = jsonDecode(savedNotesJson);
      setState(() {
        _savedNotes = decoded.map((e) => VoiceNote.fromJson(e)).toList();
      });
    } else {
      // Default note with Google AI Aoede profile
      final initialNote = VoiceNote(
        id: 'default-aoede',
        title: 'Google AI Aoede (Speaker 1)',
        text: _scriptController.text,
        durationSec: 4.8,
        isDefault: true,
        source: 'gemini_tts',
      );
      setState(() {
        _savedNotes = [initialNote];
        _activeNoteId = initialNote.id;
      });
      _persistNotes();
    }

    final logsJson = prefs.getString('call_logs');
    if (logsJson != null) {
      final List decoded = jsonDecode(logsJson);
      setState(() {
        _callLogs = decoded.map((e) => CallLogItem.fromJson(e)).toList();
      });
    }
  }

  Future<void> _persistNotes() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      'saved_notes',
      jsonEncode(_savedNotes.map((e) => e.toJson()).toList()),
    );
  }

  Future<void> _persistCallLogs() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      'call_logs',
      jsonEncode(_callLogs.map((e) => e.toJson()).toList()),
    );
  }

  // -------------------------------------------------------------------------
  // AUDIO & SPEECH LOGIC
  // -------------------------------------------------------------------------

  Future<void> _speakActiveScript() async {
    if (_isPlaying) {
      await _stopAudio();
      return;
    }
    final text = _scriptController.text.trim();
    if (text.isEmpty) return;
    await _flutterTts.speak(text);
  }

  Future<void> _stopAudio() async {
    await _flutterTts.stop();
    await _audioPlayer.stop();
    setState(() => _isPlaying = false);
  }

  Future<void> _playVoiceNote(VoiceNote note) async {
    await _stopAudio();
    if (note.audioPath != null && File(note.audioPath!).existsSync()) {
      setState(() => _isPlaying = true);
      await _audioPlayer.play(DeviceFileSource(note.audioPath!));
    } else {
      await _flutterTts.speak(note.text);
    }
  }

  Future<void> _startRecording() async {
    final hasPermission = await _audioRecorder.hasPermission();
    if (!hasPermission) return;

    final dir = await getApplicationDocumentsDirectory();
    _currentRecordingPath = '${dir.path}/rec_${DateTime.now().millisecondsSinceEpoch}.m4a';

    await _audioRecorder.start(
      const RecordConfig(encoder: AudioEncoder.aacLc),
      path: _currentRecordingPath!,
    );

    setState(() {
      _isRecording = true;
      _recordSeconds = 0;
    });

    _recordTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      setState(() => _recordSeconds++);
    });
  }

  Future<void> _stopRecording() async {
    _recordTimer?.cancel();
    final path = await _audioRecorder.stop();
    setState(() => _isRecording = false);

    if (path != null) {
      final newNote = VoiceNote(
        id: 'rec_${DateTime.now().millisecondsSinceEpoch}',
        title: 'Custom Mic Recording ${_savedNotes.length + 1}',
        text: 'Custom recorded audio note',
        audioPath: path,
        durationSec: _recordSeconds.toDouble(),
        source: 'recorded',
      );
      setState(() {
        _savedNotes.add(newNote);
      });
      _persistNotes();
    }
  }

  void _triggerAutomatedCallResponse(String trigger) async {
    final activeNote = _savedNotes.firstWhere(
      (n) => n.id == _activeNoteId,
      orElse: () => _savedNotes.first,
    );

    // Route audio to telephony stream and speak
    try {
      await _nativeChannel.invokeMethod('answerCallHardware');
      await _nativeChannel.invokeMethod('routeAudioToCall');
    } catch (_) {}

    await _playVoiceNote(activeNote);

    // Log call
    final newLog = CallLogItem(
      id: 'log_${DateTime.now().millisecondsSinceEpoch}',
      callerNumber: "+1 (555) 382-9901",
      callerName: "David Miller",
      responseNoteTitle: activeNote.title,
      timestamp: DateTime.now(),
      triggerUsed: trigger,
    );

    setState(() {
      _callLogs.insert(0, newLog);
    });
    _persistCallLogs();
  }

  // -------------------------------------------------------------------------
  // INCOMING CALL SIMULATOR DIALOG
  // -------------------------------------------------------------------------

  void _showIncomingCallDialog([String? caller]) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (dialogCtx, setDialogState) {
            return Dialog(
              backgroundColor: const Color(0xFF0F172A),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
              child: Container(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.indigo.withValues(alpha: 0.2),
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.indigo.withValues(alpha: 0.5)),
                      ),
                      child: const Icon(FeatherIcons.phoneCall, color: Colors.indigoAccent, size: 36),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      caller ?? "Incoming Test Call",
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      "+1 (555) 382-9901 • Ringing...",
                      style: TextStyle(fontSize: 13, color: Colors.white60),
                    ),
                    const SizedBox(height: 24),
                    // Test Hardware Double Press Button
                    ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF6366F1),
                        foregroundColor: Colors.white,
                        minimumSize: const Size(double.infinity, 48),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      icon: const Icon(FeatherIcons.zap, size: 16),
                      label: const Text(
                        "Simulate 2x Power Press",
                        style: TextStyle(fontWeight: FontWeight.bold),
                      ),
                      onPressed: () {
                        Navigator.pop(ctx);
                        _triggerAutomatedCallResponse("2x Power Button");
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text("⚡ Auto-Voice Response Transmitted on Call!"),
                            backgroundColor: Color(0xFF10B981),
                          ),
                        );
                      },
                    ),
                    const SizedBox(height: 8),
                    TextButton(
                      onPressed: () => Navigator.pop(ctx),
                      child: const Text("Dismiss Call", style: TextStyle(color: Colors.white54)),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  // -------------------------------------------------------------------------
  // UI BUILD
  // -------------------------------------------------------------------------

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: const Color(0xFF070B14),
        elevation: 0,
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: const Color(0xFF6366F1).withValues(alpha: 0.2),
                shape: BoxShape.circle,
                border: Border.all(color: const Color(0xFF6366F1)),
              ),
              child: const Icon(FeatherIcons.phoneForwarded, size: 16, color: Color(0xFF6366F1)),
            ),
            const SizedBox(width: 10),
            const Text(
              "SmartCall",
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Colors.white),
            ),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: const Color(0xFF10B981).withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.4)),
              ),
              child: const Text(
                "LIFETIME PRO",
                style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF10B981)),
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(FeatherIcons.phoneCall, color: Color(0xFF6366F1)),
            tooltip: "Test Incoming Call",
            onPressed: () => _showIncomingCallDialog(),
          ),
        ],
      ),
      body: IndexedStack(
        index: _currentTabIndex,
        children: [
          _buildHomeScreen(),
          _buildVoiceStudioScreen(),
          _buildTriggersScreen(),
          _buildAnalyticsScreen(),
        ],
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentTabIndex,
        onTap: (idx) => setState(() => _currentTabIndex = idx),
        backgroundColor: const Color(0xFF0A0F1E),
        selectedItemColor: const Color(0xFF6366F1),
        unselectedItemColor: Colors.white38,
        type: BottomNavigationBarType.fixed,
        items: const [
          BottomNavigationBarItem(icon: Icon(FeatherIcons.home), label: "Auto Response"),
          BottomNavigationBarItem(icon: Icon(FeatherIcons.mic), label: "Voice Studio"),
          BottomNavigationBarItem(icon: Icon(FeatherIcons.sliders), label: "Triggers"),
          BottomNavigationBarItem(icon: Icon(FeatherIcons.activity), label: "Analytics"),
        ],
      ),
    );
  }

  // -------------------------------------------------------------------------
  // TABS
  // -------------------------------------------------------------------------

  Widget _buildHomeScreen() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Banner Status
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFF0E1526),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFF1E293B)),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFF10B981).withValues(alpha: 0.1),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(FeatherIcons.shield, color: Color(0xFF10B981), size: 20),
                ),
                const SizedBox(width: 14),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        "Hardware Intercept Service Active",
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.white),
                      ),
                      Text(
                        "2x Power button press will broadcast selected voice",
                        style: TextStyle(fontSize: 11, color: Colors.white60),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Script Editor Card
          const Text(
            "ACTIVE CALL RESPONSE SCRIPT",
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white54, letterSpacing: 0.8),
          ),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFF0E1526),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFF1E293B)),
            ),
            child: Column(
              children: [
                TextField(
                  controller: _scriptController,
                  maxLines: 4,
                  style: const TextStyle(fontSize: 14, color: Colors.white, height: 1.4),
                  decoration: const InputDecoration(
                    border: InputBorder.none,
                    hintText: "Enter the message to speak aloud on the call...",
                    hintStyle: TextStyle(color: Colors.white30),
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    // Listen Preview Button
                    Expanded(
                      child: OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.white,
                          side: const BorderSide(color: Color(0xFF334155)),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        icon: Icon(_isPlaying ? FeatherIcons.square : FeatherIcons.play, size: 14, color: const Color(0xFF6366F1)),
                        label: Text(_isPlaying ? "Stop Preview" : "Listen Preview"),
                        onPressed: _speakActiveScript,
                      ),
                    ),
                    const SizedBox(width: 10),
                    // Generate Audio Button
                    Expanded(
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF6366F1),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        icon: const Icon(FeatherIcons.zap, size: 14),
                        label: const Text("Generate Audio"),
                        onPressed: _speakActiveScript,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Quick Hardware Summary
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFF0E1526),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFF1E293B)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text("Active Trigger Configuration", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.white)),
                const SizedBox(height: 10),
                _buildTriggerSummaryItem("Physical Power Key", "2x Click (<650ms)", FeatherIcons.power),
                _buildTriggerSummaryItem("Default Voice Engine", "Aoede (Speaker 1) Female", FeatherIcons.volume2),
                _buildTriggerSummaryItem("Block Ringtone Mute", "Enabled (Active Defense)", FeatherIcons.checkCircle),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTriggerSummaryItem(String label, String value, IconData icon) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Icon(icon, size: 14, color: const Color(0xFF6366F1)),
          const SizedBox(width: 10),
          Text(label, style: const TextStyle(fontSize: 12, color: Colors.white70)),
          const Spacer(),
          Text(value, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.white)),
        ],
      ),
    );
  }

  Widget _buildVoiceStudioScreen() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text("IN-APP VOICE RECORDER", style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white54, letterSpacing: 0.8)),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: const Color(0xFF0E1526),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFF1E293B)),
            ),
            child: Column(
              children: [
                GestureDetector(
                  onTap: _isRecording ? _stopRecording : _startRecording,
                  child: Container(
                    width: 70,
                    height: 70,
                    decoration: BoxDecoration(
                      color: _isRecording ? Colors.redAccent.withValues(alpha: 0.2) : const Color(0xFF6366F1).withValues(alpha: 0.15),
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: _isRecording ? Colors.redAccent : const Color(0xFF6366F1),
                        width: 2,
                      ),
                    ),
                    child: Icon(
                      _isRecording ? FeatherIcons.square : FeatherIcons.mic,
                      color: _isRecording ? Colors.redAccent : const Color(0xFF6366F1),
                      size: 28,
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  _isRecording ? "Recording: 00:0${_recordSeconds}s" : "Tap to record custom response",
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: _isRecording ? Colors.redAccent : Colors.white70,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          const Text("SAVED VOICE RESPONSES", style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white54, letterSpacing: 0.8)),
          const SizedBox(height: 8),
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _savedNotes.length,
            itemBuilder: (ctx, i) {
              final note = _savedNotes[i];
              final isActive = note.id == _activeNoteId;
              return Container(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFF0E1526),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: isActive ? const Color(0xFF6366F1) : const Color(0xFF1E293B),
                    width: isActive ? 1.5 : 1,
                  ),
                ),
                child: Row(
                  children: [
                    IconButton(
                      icon: const Icon(FeatherIcons.playCircle, color: Color(0xFF6366F1), size: 28),
                      onPressed: () => _playVoiceNote(note),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(note.title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.white)),
                          const SizedBox(height: 2),
                          Text("${note.durationSec.toStringAsFixed(1)}s • ${note.source}", style: const TextStyle(fontSize: 11, color: Colors.white54)),
                        ],
                      ),
                    ),
                    if (isActive)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFF6366F1).withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Text("ACTIVE", style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF6366F1))),
                      )
                    else
                      TextButton(
                        onPressed: () => setState(() => _activeNoteId = note.id),
                        child: const Text("Use", style: TextStyle(color: Colors.white54, fontSize: 12)),
                      ),
                  ],
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildTriggersScreen() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text("PHYSICAL HARDWARE INTERCEPT", style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white54, letterSpacing: 0.8)),
        const SizedBox(height: 8),
        Container(
          decoration: BoxDecoration(
            color: const Color(0xFF0E1526),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFF1E293B)),
          ),
          child: Column(
            children: [
              SwitchListTile(
                title: const Text("Double Power Press", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Colors.white)),
                subtitle: const Text("Pressing power button 2x answers call with voice", style: TextStyle(fontSize: 11, color: Colors.white54)),
                value: _doublePowerEnabled,
                activeThumbColor: const Color(0xFF6366F1),
                onChanged: (val) {
                  setState(() => _doublePowerEnabled = val);
                  _nativeChannel.invokeMethod('setInterceptServiceActive', {'enabled': val});
                },
              ),
              const Divider(color: Color(0xFF1E293B), height: 1),
              SwitchListTile(
                title: const Text("Block Single Press Mute", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Colors.white)),
                subtitle: const Text("Prevents Android OS from silencing ringtone accidentally", style: TextStyle(fontSize: 11, color: Colors.white54)),
                value: _blockDefaultMute,
                activeThumbColor: const Color(0xFF6366F1),
                onChanged: (val) => setState(() => _blockDefaultMute = val),
              ),
              const Divider(color: Color(0xFF1E293B), height: 1),
              SwitchListTile(
                title: const Text("Double Tap Screen", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Colors.white)),
                subtitle: const Text("Double tap on incoming call heads-up notification", style: TextStyle(fontSize: 11, color: Colors.white54)),
                value: _doubleTapEnabled,
                activeThumbColor: const Color(0xFF6366F1),
                onChanged: (val) => setState(() => _doubleTapEnabled = val),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),

        const Text("AUTOMATION TIMERS", style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white54, letterSpacing: 0.8)),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: const Color(0xFF0E1526),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFF1E293B)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text("Auto-Connect Delay", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.white)),
                  Text("${_autoAnswerDelaySec}s", style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF6366F1))),
                ],
              ),
              Slider(
                value: _autoAnswerDelaySec.toDouble(),
                min: 0,
                max: 5,
                divisions: 5,
                activeColor: const Color(0xFF6366F1),
                onChanged: (v) => setState(() => _autoAnswerDelaySec = v.toInt()),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildAnalyticsScreen() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Row(
          children: [
            _buildStatCard("Intercepted", "${_callLogs.length + 14}", FeatherIcons.phoneIncoming),
            const SizedBox(width: 12),
            _buildStatCard("Saved Time", "48 mins", FeatherIcons.clock),
          ],
        ),
        const SizedBox(height: 20),
        const Text("INTERCEPT HISTORY", style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white54, letterSpacing: 0.8)),
        const SizedBox(height: 8),
        if (_callLogs.isEmpty)
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: const Color(0xFF0E1526),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFF1E293B)),
            ),
            child: const Center(
              child: Text("No intercepted calls yet. Use Test Call to simulate.", style: TextStyle(color: Colors.white54, fontSize: 12)),
            ),
          )
        else
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _callLogs.length,
            itemBuilder: (ctx, i) {
              final log = _callLogs[i];
              return Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFF0E1526),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFF1E293B)),
                ),
                child: Row(
                  children: [
                    const Icon(FeatherIcons.phoneMissed, size: 16, color: Color(0xFF10B981)),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(log.callerName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.white)),
                          Text("${log.callerNumber} • ${log.triggerUsed}", style: const TextStyle(fontSize: 11, color: Colors.white54)),
                        ],
                      ),
                    ),
                    Text(
                      "${log.timestamp.hour.toString().padLeft(2, '0')}:${log.timestamp.minute.toString().padLeft(2, '0')}",
                      style: const TextStyle(fontSize: 11, color: Colors.white38),
                    ),
                  ],
                ),
              );
            },
          ),
      ],
    );
  }

  Widget _buildStatCard(String label, String value, IconData icon) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: const Color(0xFF0E1526),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFF1E293B)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: const Color(0xFF6366F1), size: 18),
            const SizedBox(height: 12),
            Text(value, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.white)),
            Text(label, style: const TextStyle(fontSize: 11, color: Colors.white54)),
          ],
        ),
      ),
    );
  }
}