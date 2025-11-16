#!/usr/bin/env python3
"""
Raspberry Pi Smile Detection Client
This script captures photos from Pi Camera, detects smiles, and uploads to the server.
"""

import cv2
import requests
import time
import json
from datetime import datetime

# ============= CONFIGURATION =============
SERVER_URL = "http://YOUR_SERVER_IP:3001/upload"
API_KEY = "YOUR_API_KEY_HERE"  # Get this from the Camera Management page

# Detection settings
SMILE_THRESHOLD = 0.65
COOLDOWN_SECONDS = 3

# Camera settings
CAMERA_WIDTH = 1920
CAMERA_HEIGHT = 1080
# =========================================

class SmileDetector:
    def __init__(self):
        # Load OpenCV's pre-trained face and smile detectors
        self.face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        )
        self.smile_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + 'haarcascade_smile.xml'
        )
        
        # Initialize camera
        self.camera = cv2.VideoCapture(0)
        self.camera.set(cv2.CAP_PROP_FRAME_WIDTH, CAMERA_WIDTH)
        self.camera.set(cv2.CAP_PROP_FRAME_HEIGHT, CAMERA_HEIGHT)
        
        self.last_capture_time = 0
        
        print("✅ Smile Detector initialized")
        print(f"📡 Server: {SERVER_URL}")
        print(f"🔑 API Key: {API_KEY[:10]}...")
        
    def detect_smile(self, frame):
        """Detect if someone is smiling in the frame"""
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        
        # Detect faces
        faces = self.face_cascade.detectMultiScale(
            gray, 
            scaleFactor=1.1, 
            minNeighbors=5,
            minSize=(100, 100)
        )
        
        for (x, y, w, h) in faces:
            # Extract face region
            face_gray = gray[y:y+h, x:x+w]
            
            # Detect smiles in face region
            smiles = self.smile_cascade.detectMultiScale(
                face_gray,
                scaleFactor=1.8,
                minNeighbors=20,
                minSize=(25, 25)
            )
            
            # Calculate smile confidence
            if len(smiles) > 0:
                # More detected smiles = higher confidence
                confidence = min(len(smiles) / 3.0, 1.0)
                return True, confidence, (x, y, w, h)
        
        return False, 0.0, None
    
    def upload_photo(self, frame):
        """Upload photo to server"""
        try:
            # Encode frame as JPEG
            _, img_encoded = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 95])
            
            # Prepare upload
            files = {'photo': ('smile.jpg', img_encoded.tobytes(), 'image/jpeg')}
            headers = {'X-API-Key': API_KEY}
            
            # Upload
            response = requests.post(SERVER_URL, files=files, headers=headers, timeout=5)
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Upload successful! Total: {data.get('total', '?')}")
                return True
            else:
                print(f"❌ Upload failed: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Upload error: {e}")
            return False
    
    def run(self):
        """Main detection loop"""
        print("\n🎥 Starting smile detection...")
        print("Press Ctrl+C to stop\n")
        
        try:
            while True:
                # Capture frame
                ret, frame = self.camera.read()
                if not ret:
                    print("❌ Failed to capture frame")
                    time.sleep(1)
                    continue
                
                # Detect smile
                has_smile, confidence, face_rect = self.detect_smile(frame)
                
                # Check cooldown
                current_time = time.time()
                time_since_last = current_time - self.last_capture_time
                
                if has_smile and confidence >= SMILE_THRESHOLD:
                    if time_since_last >= COOLDOWN_SECONDS:
                        print(f"😊 Smile detected! Confidence: {confidence:.2%}")
                        
                        if self.upload_photo(frame):
                            self.last_capture_time = current_time
                            print(f"⏰ Next capture available in {COOLDOWN_SECONDS}s\n")
                    else:
                        remaining = COOLDOWN_SECONDS - time_since_last
                        print(f"⏳ Cooldown... {remaining:.1f}s remaining")
                
                # Small delay to reduce CPU usage
                time.sleep(0.1)
                
        except KeyboardInterrupt:
            print("\n\n🛑 Stopping smile detector...")
        finally:
            self.camera.release()
            print("👋 Goodbye!")

def main():
    print("=" * 50)
    print("🎉 Raspberry Pi Smile Detection Client")
    print("=" * 50)
    
    # Check configuration
    if API_KEY == "YOUR_API_KEY_HERE":
        print("❌ ERROR: Please set your API_KEY in the configuration")
        print("   Get it from: http://YOUR_SERVER/cameras")
        return
    
    if "YOUR_SERVER_IP" in SERVER_URL:
        print("❌ ERROR: Please set your SERVER_URL in the configuration")
        return
    
    # Run detector
    detector = SmileDetector()
    detector.run()

if __name__ == "__main__":
    main()
