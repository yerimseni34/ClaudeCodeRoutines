// Varsayılan egzersiz kütüphanesi (Türkçe). Kullanıcı kendi egzersizlerini de ekleyebilir.
export const seedExercises: { name: string; muscle: string; equipment: string }[] = [
  // Göğüs
  { name: "Bench Press", muscle: "Göğüs", equipment: "Barbell" },
  { name: "Incline Bench Press", muscle: "Göğüs", equipment: "Barbell" },
  { name: "Dumbbell Bench Press", muscle: "Göğüs", equipment: "Dumbbell" },
  { name: "Incline Dumbbell Bench Press", muscle: "Göğüs", equipment: "Dumbbell" },
  { name: "Machine Chest Fly", muscle: "Göğüs", equipment: "Makine" },
  { name: "Cable Crossover", muscle: "Göğüs", equipment: "Kablo" },
  { name: "Dips", muscle: "Göğüs", equipment: "Vücut Ağırlığı" },
  { name: "Push Up", muscle: "Göğüs", equipment: "Vücut Ağırlığı" },

  // Sırt
  { name: "Deadlift", muscle: "Sırt", equipment: "Barbell" },
  { name: "Barbell Row", muscle: "Sırt", equipment: "Barbell" },
  { name: "Pull Up", muscle: "Sırt", equipment: "Vücut Ağırlığı" },
  { name: "Lat Pulldown", muscle: "Sırt", equipment: "Makine" },
  { name: "Seated Cable Row", muscle: "Sırt", equipment: "Kablo" },
  { name: "Dumbbell Row", muscle: "Sırt", equipment: "Dumbbell" },
  { name: "Face Pull", muscle: "Sırt", equipment: "Kablo" },

  // Omuz
  { name: "Overhead Press", muscle: "Omuz", equipment: "Barbell" },
  { name: "Dumbbell Shoulder Press", muscle: "Omuz", equipment: "Dumbbell" },
  { name: "Lateral Raise", muscle: "Omuz", equipment: "Dumbbell" },
  { name: "Rear Delt Fly", muscle: "Omuz", equipment: "Dumbbell" },
  { name: "Arnold Press", muscle: "Omuz", equipment: "Dumbbell" },

  // Kol — Biceps
  { name: "Barbell Curl", muscle: "Biceps", equipment: "Barbell" },
  { name: "Dumbbell Curl", muscle: "Biceps", equipment: "Dumbbell" },
  { name: "Hammer Curl", muscle: "Biceps", equipment: "Dumbbell" },
  { name: "Cable Curl", muscle: "Biceps", equipment: "Kablo" },

  // Kol — Triceps
  { name: "Triceps Pushdown", muscle: "Triceps", equipment: "Kablo" },
  { name: "Overhead Triceps Extension", muscle: "Triceps", equipment: "Dumbbell" },
  { name: "Skull Crusher", muscle: "Triceps", equipment: "Barbell" },
  { name: "Close Grip Bench Press", muscle: "Triceps", equipment: "Barbell" },

  // Bacak
  { name: "Squat", muscle: "Bacak", equipment: "Barbell" },
  { name: "Front Squat", muscle: "Bacak", equipment: "Barbell" },
  { name: "Leg Press", muscle: "Bacak", equipment: "Makine" },
  { name: "Romanian Deadlift", muscle: "Bacak", equipment: "Barbell" },
  { name: "Leg Extension", muscle: "Bacak", equipment: "Makine" },
  { name: "Leg Curl", muscle: "Bacak", equipment: "Makine" },
  { name: "Walking Lunge", muscle: "Bacak", equipment: "Dumbbell" },
  { name: "Calf Raise", muscle: "Bacak", equipment: "Makine" },
  { name: "Hip Thrust", muscle: "Bacak", equipment: "Barbell" },

  // Karın
  { name: "Plank", muscle: "Karın", equipment: "Vücut Ağırlığı" },
  { name: "Hanging Leg Raise", muscle: "Karın", equipment: "Vücut Ağırlığı" },
  { name: "Cable Crunch", muscle: "Karın", equipment: "Kablo" },
  { name: "Ab Wheel", muscle: "Karın", equipment: "Diğer" },

  // Kardiyo
  { name: "Koşu Bandı", muscle: "Kardiyo", equipment: "Makine" },
  { name: "Bisiklet", muscle: "Kardiyo", equipment: "Makine" },
  { name: "Kürek", muscle: "Kardiyo", equipment: "Makine" },
];
