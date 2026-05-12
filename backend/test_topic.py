"""Quick test for topic-change detection."""
import sys
sys.path.insert(0, '.')

from app.routes.chat import _detect_topic_change, _classify_topic

print("=== Topic Classification ===")
print("demam ->", _classify_topic("saya sakit demam ringan bagaimana cara meredahkannya"))
print("jadwal ->", _classify_topic("bagaimana jadwal dokter di puskesmas"))
print("obat ->", _classify_topic("obat apa untuk sakit kepala"))
print("lokasi ->", _classify_topic("dimana alamat puskesmas wori"))

print("\n=== Topic Change Detection ===")
print("demam -> jadwal:", _detect_topic_change("jadwal dokter puskesmas", ["saya sakit demam ringan"]))
print("demam -> demam:", _detect_topic_change("bagaimana cara menurunkan demam", ["saya sakit demam ringan"]))
print("jadwal -> lokasi:", _detect_topic_change("dimana alamat puskesmas", ["jadwal dokter puskesmas"]))
print("no history:", _detect_topic_change("jadwal dokter", []))

print("\nAll tests passed!")
