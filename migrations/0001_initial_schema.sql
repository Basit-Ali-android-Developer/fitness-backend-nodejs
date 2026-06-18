-- 0001_initial_schema.sql

-- 1. Users
CREATE TABLE Users (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    Name TEXT NOT NULL,
    Email TEXT NOT NULL UNIQUE,
    Password TEXT NOT NULL,
    UserType TEXT NOT NULL DEFAULT 'User',
    Height REAL NULL,
    Weight REAL NULL,
    Age INTEGER NULL,
    Gender TEXT NULL,
    IsProfileComplete INTEGER NOT NULL DEFAULT 0,
    IsDeleted INTEGER NOT NULL DEFAULT 0,
    CreatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    DeletedAt TEXT NULL
);

-- 2. UserDietPlans
CREATE TABLE UserDietPlans (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    UserId INTEGER NOT NULL,
    GoalType TEXT NOT NULL,
    TargetWeight REAL NOT NULL,
    BMR REAL NOT NULL,
    MaintenanceCalories REAL NOT NULL,
    TargetCalories REAL NOT NULL,
    CreatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    ActivityLevel TEXT NOT NULL,
    ProteinGrams REAL NOT NULL DEFAULT 0,
    CarbsGrams REAL NOT NULL DEFAULT 0,
    FatsGrams REAL NOT NULL DEFAULT 0,
    FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE,
    UNIQUE (UserId)
);

-- 3. Meals
CREATE TABLE Meals (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    UserId INTEGER NOT NULL,
    Name TEXT NOT NULL,
    MealTime TEXT NOT NULL,
    TotalCalories REAL NOT NULL,
    TotalProtein REAL NOT NULL,
    TotalCarbs REAL NOT NULL,
    TotalFats REAL NOT NULL,
    CreatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (UserId, Name),
    UNIQUE (UserId, MealTime),
    FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE
);

-- 4. Foods
CREATE TABLE Foods (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    Name TEXT NOT NULL UNIQUE,
    Calories REAL NOT NULL,
    Protein REAL NOT NULL,
    Carbs REAL NOT NULL,
    Fats REAL NOT NULL,
    Unit TEXT NOT NULL,
    IsActive INTEGER NOT NULL DEFAULT 1,
    CreatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 5. MealIngredients
CREATE TABLE MealIngredients (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    MealId INTEGER NOT NULL,
    FoodId INTEGER NOT NULL,
    Quantity REAL NOT NULL,
    Unit TEXT,
    Calories REAL NOT NULL,
    Protein REAL NOT NULL,
    Carbs REAL NOT NULL,
    Fats REAL NOT NULL,
    CreatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (MealId) REFERENCES Meals(Id) ON DELETE CASCADE,
    FOREIGN KEY (FoodId) REFERENCES Foods(Id)
);

-- 6. MealTracking
CREATE TABLE MealTracking (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    UserId INTEGER NOT NULL,
    MealId INTEGER NOT NULL,
    Name TEXT NOT NULL,
    MealTime TEXT NOT NULL,
    TotalCalories REAL NOT NULL,
    TotalProtein REAL NOT NULL,
    TotalCarbs REAL NOT NULL,
    TotalFats REAL NOT NULL,
    Date TEXT NOT NULL,
    IsDone INTEGER DEFAULT 0,
    CreatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (UserId, MealId, Date)
);

-- 7. MealTrackingIngredients
CREATE TABLE MealTrackingIngredients (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    MealTrackingId INTEGER NOT NULL,
    FoodId INTEGER NOT NULL,
    Name TEXT,
    Quantity REAL NOT NULL,
    Unit TEXT,
    Calories REAL NOT NULL,
    Protein REAL NOT NULL,
    Carbs REAL NOT NULL,
    Fats REAL NOT NULL,
    CreatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (MealTrackingId) REFERENCES MealTracking(Id) ON DELETE CASCADE
);

-- 8. MealHistory
CREATE TABLE MealHistory (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    UserId INTEGER NOT NULL,
    MealId INTEGER NOT NULL,
    Name TEXT NOT NULL,
    MealTime TEXT NOT NULL,
    TotalCalories REAL NOT NULL,
    TotalProtein REAL NOT NULL,
    TotalCarbs REAL NOT NULL,
    TotalFats REAL NOT NULL,
    Date TEXT NOT NULL,
    IsDone INTEGER DEFAULT 0,
    CreatedAt TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 9. MealHistoryIngredients
CREATE TABLE MealHistoryIngredients (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    MealHistoryId INTEGER NOT NULL,
    FoodId INTEGER NOT NULL,
    Name TEXT,
    Quantity REAL NOT NULL,
    Unit TEXT,
    Calories REAL NOT NULL,
    Protein REAL NOT NULL,
    Carbs REAL NOT NULL,
    Fats REAL NOT NULL,
    CreatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (MealHistoryId) REFERENCES MealHistory(Id) ON DELETE CASCADE
);

-- 10. Exercises
CREATE TABLE Exercises (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    Name TEXT NOT NULL,
    MuscleGroup TEXT,
    EquipmentType TEXT,
    Description TEXT,
    CreatedAt TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 11. WorkoutTemplates
CREATE TABLE WorkoutTemplates (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    Name TEXT NOT NULL,
    Goal TEXT NOT NULL,
    Level TEXT NOT NULL,
    DaysCount INTEGER NOT NULL,
    Description TEXT,
    CreatedAt TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 12. WorkoutTemplateDays
CREATE TABLE WorkoutTemplateDays (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    TemplateId INTEGER NOT NULL,
    DayNumber INTEGER NOT NULL,
    Title TEXT NOT NULL,
    FOREIGN KEY (TemplateId) REFERENCES WorkoutTemplates(Id) ON DELETE CASCADE
);

-- 13. WorkoutTemplateExercises
CREATE TABLE WorkoutTemplateExercises (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    TemplateDayId INTEGER NOT NULL,
    ExerciseName TEXT NOT NULL,
    ExerciseId INTEGER NOT NULL,
    Sets INTEGER NOT NULL,
    Reps INTEGER NOT NULL,
    OrderIndex INTEGER NOT NULL,
    FOREIGN KEY (TemplateDayId) REFERENCES WorkoutTemplateDays(Id) ON DELETE CASCADE,
    FOREIGN KEY (ExerciseId) REFERENCES Exercises(Id)
);

-- 14. UserWorkoutPlans
CREATE TABLE UserWorkoutPlans (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    UserId INTEGER NOT NULL,
    Name TEXT NOT NULL,
    Goal TEXT,
    Level TEXT,
    DaysCount INTEGER NOT NULL,
    Description TEXT,
    CurrentDayIndex INTEGER DEFAULT 1,
    IsActive INTEGER DEFAULT 1,
    CreatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TEXT NULL
);

-- Index for unique active plans
CREATE UNIQUE INDEX UQ_User_ActivePlan
ON UserWorkoutPlans(UserId)
WHERE IsActive = 1;

-- 15. UserWorkoutPlanDays
CREATE TABLE UserWorkoutPlanDays (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    UserWorkoutPlanId INTEGER NOT NULL,
    DayIndex INTEGER NOT NULL,
    Title TEXT NOT NULL,
    FOREIGN KEY (UserWorkoutPlanId) REFERENCES UserWorkoutPlans(Id) ON DELETE CASCADE,
    UNIQUE (UserWorkoutPlanId, DayIndex),
    CHECK (DayIndex > 0)
);

-- 16. UserWorkoutPlanExercises
CREATE TABLE UserWorkoutPlanExercises (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    UserWorkoutPlanDayId INTEGER NOT NULL,
    ExerciseId INTEGER NOT NULL,
    Sets INTEGER NOT NULL,
    Reps INTEGER NOT NULL,
    ExerciseName TEXT,
    OrderIndex INTEGER NOT NULL,
    FOREIGN KEY (UserWorkoutPlanDayId) REFERENCES UserWorkoutPlanDays(Id) ON DELETE CASCADE,
    FOREIGN KEY (ExerciseId) REFERENCES Exercises(Id),
    UNIQUE (UserWorkoutPlanDayId, OrderIndex),
    CHECK (Sets > 0 AND Reps > 0)
);

-- 17. UserWorkoutSessions
CREATE TABLE UserWorkoutSessions (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    UserId INTEGER NOT NULL,
    PlanId INTEGER NOT NULL,
    DayIndex INTEGER NOT NULL,
    Status TEXT DEFAULT 'in_progress',
    StartTime TEXT DEFAULT CURRENT_TIMESTAMP,
    EndTime TEXT NULL
);

-- 18. UserWorkoutSessionLogs
CREATE TABLE UserWorkoutSessionLogs (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    SessionId INTEGER NOT NULL,
    ExerciseId INTEGER NOT NULL,
    SetNumber INTEGER NOT NULL,
    Reps INTEGER NOT NULL,
    Weight REAL NULL,
    CreatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (SessionId) REFERENCES UserWorkoutSessions(Id) ON DELETE CASCADE
);
