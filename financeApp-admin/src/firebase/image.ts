export const uploadImage = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_URL}/image/upload`,
      { method: "POST", body: formData },
    );
    const data = await response.json();
    if (data.secure_url) {
      return data.secure_url as string;
    } else {
      console.error("Cloudinary error:", data.error?.message);
    }
  } catch (error) {
    console.error("Upload error:", error);
  }
};
