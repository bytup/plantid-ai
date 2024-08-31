"use client";

import React, { useState, useRef } from "react";
import Image from "next/image";
import { GoogleGenerativeAI } from "@google/generative-ai";

type PlantInfo = {
  name: string;
  scientificName: string;
  family: string;
  origin: string;
  characteristics: string;
  uses: string;
};

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [plantInfo, setPlantInfo] = useState<PlantInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      handleImageSelection(selectedFile);
    }
  };

  const handleImageSelection = (selectedFile: File) => {
    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(selectedFile);
  };

  const startCamera = async () => {
    setShowCamera(true);
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error accessing the camera", err);
      }
    }
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext("2d");
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(
          videoRef.current,
          0,
          0,
          canvasRef.current.width,
          canvasRef.current.height
        );
        canvasRef.current.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], "captured_image.jpg", {
              type: "image/jpeg",
            });
            handleImageSelection(file);
            setShowCamera(false);
            stopCameraStream();
          }
        }, "image/jpeg");
      }
    }
  };

  const stopCameraStream = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => track.stop());
    }
  };

  const identifyPlant = async () => {
    if (!file) return;

    setLoading(true);

    const genAI = new GoogleGenerativeAI(
      process.env.NEXT_PUBLIC_GEMINI_API_KEY!
    );

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64Image = reader.result as string;

        const promptContent = `
          Identify this plant and provide the following information:
          1. Common name
          2. Scientific name
          3. Family
          4. Origin
          5. Key characteristics (in brief)
          6. Common uses

          Provide the information in a JSON format with the following keys:
          {
            "name": "",
            "scientificName": "",
            "family": "",
            "origin": "",
            "characteristics": "",
            "uses": ""
          }
        `;

        const result = await model.generateContent([
          promptContent,
          {
            inlineData: {
              mimeType: file.type,
              data: base64Image.split(",")[1],
            },
          },
        ]);

        const responseText = result.response.text();

        // Clean up the response text
        const cleanedResponse = responseText
          .replace(/```json\n?|\n?```/g, "")
          .trim();

        // Parse the cleaned response into a structured format
        try {
          const parsedInfo: PlantInfo = JSON.parse(cleanedResponse);
          setPlantInfo(parsedInfo);
        } catch (parseError) {
          console.error("Error parsing plant info:", parseError);
          setPlantInfo(null);
        }

        setLoading(false);
      };
    } catch (error) {
      console.error("Error identifying plant:", error);
      setPlantInfo(null);
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-green-50 p-8">
      <h1 className="text-4xl font-bold mb-8 text-center text-green-800">
        Plant Identifier
      </h1>
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-8">
          <div className="mb-4 flex justify-between">
            <div>
              <label
                className="block text-gray-700 text-sm font-bold mb-2"
                htmlFor="plant-image"
              >
                Upload a plant image
              </label>
              <input
                type="file"
                id="plant-image"
                accept="image/*"
                onChange={handleFileChange}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              />
            </div>
            <button
              onClick={startCamera}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            >
              Open Camera
            </button>
          </div>
          {showCamera && (
            <div className="mb-4">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full max-w-md mx-auto"
              />
              <button
                onClick={captureImage}
                className="mt-2 bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              >
                Capture Image
              </button>
            </div>
          )}
          <canvas ref={canvasRef} style={{ display: "none" }} />
          {preview && (
            <div className="mb-4">
              <Image
                src={preview}
                alt="Preview"
                width={300}
                height={300}
                className="object-cover rounded-lg"
              />
            </div>
          )}
          <button
            onClick={identifyPlant}
            disabled={!file || loading}
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50"
          >
            {loading ? "Identifying..." : "Identify Plant"}
          </button>
          {plantInfo && (
            <div className="mt-8">
              <h2 className="text-2xl font-semibold mb-4">Plant Information</h2>
              <table className="w-full border-collapse">
                <tbody>
                  {Object.entries(plantInfo).map(([key, value]) => (
                    <tr key={key} className="border-b">
                      <td className="py-2 px-4 font-semibold text-gray-700 capitalize">
                        {key.replace(/([A-Z])/g, " $1").trim()}
                      </td>
                      <td className="py-2 px-4 text-gray-600">{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
