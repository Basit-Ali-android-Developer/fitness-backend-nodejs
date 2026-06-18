-- 01_initial_schema.sql

-- 1. Users
CREATE TABLE Users (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Name NVARCHAR(50) NOT NULL,
    Email NVARCHAR(100) NOT NULL UNIQUE,
    Password NVARCHAR(255) NOT NULL,
    UserType NVARCHAR(20) NOT NULL DEFAULT 'User',
    Height FLOAT NULL,
    Weight FLOAT NULL,
    IsDeleted BIT NOT NULL DEFAULT 0,
    CreatedAt DATETIME DEFAULT GETDATE(),
    UpdatedAt DATETIME DEFAULT GETDATE(),
    DeletedAt DATETIME NULL
);

-- 2. UserDietPlans
CREATE TABLE UserDietPlans (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    UserId INT NOT NULL,
    GoalType NVARCHAR(20) NOT NULL,
    TargetWeight FLOAT NOT NULL,
    BMR FLOAT NOT NULL,
    MaintenanceCalories FLOAT NOT NULL,
    TargetCalories FLOAT NOT NULL,
    CreatedAt DATETIME DEFAULT GETDATE(),
    UpdatedAt DATETIME DEFAULT GETDATE(),
    ActivityLevel NVARCHAR(20) NOT NULL,
    ProteinGrams FLOAT NOT NULL DEFAULT 0,
    CarbsGrams FLOAT NOT NULL DEFAULT 0,
    FatsGrams FLOAT NOT NULL DEFAULT 0,
    CONSTRAINT FK_UserDietPlans_User FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE,
    CONSTRAINT UQ_UserDiet UNIQUE (UserId)
);

-- 3. Meals
CREATE TABLE Meals (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    UserId INT NOT NULL,
    Name NVARCHAR(50) NOT NULL,
    MealTime NVARCHAR(8) NOT NULL,
    TotalCalories FLOAT NOT NULL,
    TotalProtein FLOAT NOT NULL,
    TotalCarbs FLOAT NOT NULL,
    TotalFats FLOAT NOT NULL,
    CreatedAt DATETIME DEFAULT GETDATE(),
    UpdatedAt DATETIME DEFAULT GETDATE(),
    CONSTRAINT UQ_User_MealName UNIQUE (UserId, Name),
    CONSTRAINT UQ_User_MealTime UNIQUE (UserId, MealTime),
    CONSTRAINT FK_Meals_User FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE
);

-- 4. Foods (Missing in original script, referenced as FK in MealIngredients)
CREATE TABLE Foods (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Name NVARCHAR(100) NOT NULL UNIQUE,
    Calories FLOAT NOT NULL,
    Protein FLOAT NOT NULL,
    Carbs FLOAT NOT NULL,
    Fats FLOAT NOT NULL,
    Unit NVARCHAR(10) NOT NULL,
    IsActive BIT NOT NULL DEFAULT 1,
    CreatedAt DATETIME DEFAULT GETDATE(),
    UpdatedAt DATETIME DEFAULT GETDATE()
);

-- 5. MealIngredients
CREATE TABLE MealIngredients (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    MealId INT NOT NULL,
    FoodId INT NOT NULL,
    Quantity FLOAT NOT NULL,
    Unit NVARCHAR(10),
    Calories FLOAT NOT NULL,
    Protein FLOAT NOT NULL,
    Carbs FLOAT NOT NULL,
    Fats FLOAT NOT NULL,
    CreatedAt DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_MealIngredients_Meal FOREIGN KEY (MealId) REFERENCES Meals(Id) ON DELETE CASCADE,
    CONSTRAINT FK_MealIngredients_Food FOREIGN KEY (FoodId) REFERENCES Foods(Id)
);

-- 6. MealTracking
CREATE TABLE MealTracking (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    UserId INT NOT NULL,
    MealId INT NOT NULL,
    Name NVARCHAR(100) NOT NULL,
    MealTime NVARCHAR(8) NOT NULL,
    TotalCalories FLOAT NOT NULL,
    TotalProtein FLOAT NOT NULL,
    TotalCarbs FLOAT NOT NULL,
    TotalFats FLOAT NOT NULL,
    Date DATE NOT NULL,
    IsDone BIT DEFAULT 0,
    CreatedAt DATETIME DEFAULT GETDATE(),
    CONSTRAINT UQ_User_Meal_Date UNIQUE (UserId, MealId, Date)
);

-- 7. MealTrackingIngredients
CREATE TABLE MealTrackingIngredients (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    MealTrackingId INT NOT NULL,
    FoodId INT NOT NULL,
    Name NVARCHAR(100),
    Quantity FLOAT NOT NULL,
    Unit NVARCHAR(10),
    Calories FLOAT NOT NULL,
    Protein FLOAT NOT NULL,
    Carbs FLOAT NOT NULL,
    Fats FLOAT NOT NULL,
    CreatedAt DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_TrackingIngredients_Tracking FOREIGN KEY (MealTrackingId) REFERENCES MealTracking(Id) ON DELETE CASCADE
);

-- 8. MealHistory
CREATE TABLE MealHistory (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    UserId INT NOT NULL,
    MealId INT NOT NULL,
    Name NVARCHAR(100) NOT NULL,
    MealTime NVARCHAR(8) NOT NULL,
    TotalCalories FLOAT NOT NULL,
    TotalProtein FLOAT NOT NULL,
    TotalCarbs FLOAT NOT NULL,
    TotalFats FLOAT NOT NULL,
    Date DATE NOT NULL,
    IsDone BIT DEFAULT 0,
    CreatedAt DATETIME DEFAULT GETDATE()
);

-- 9. MealHistoryIngredients
CREATE TABLE MealHistoryIngredients (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    MealHistoryId INT NOT NULL,
    FoodId INT NOT NULL,
    Name NVARCHAR(100),
    Quantity FLOAT NOT NULL,
    Unit NVARCHAR(10),
    Calories FLOAT NOT NULL,
    Protein FLOAT NOT NULL,
    Carbs FLOAT NOT NULL,
    Fats FLOAT NOT NULL,
    CreatedAt DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_HistoryIngredients_History FOREIGN KEY (MealHistoryId) REFERENCES MealHistory(Id) ON DELETE CASCADE
);

-- 10. Exercises
CREATE TABLE Exercises (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Name NVARCHAR(100) NOT NULL,
    MuscleGroup NVARCHAR(50),
    EquipmentType NVARCHAR(50),
    Description NVARCHAR(255),
    CreatedAt DATETIME DEFAULT GETDATE()
);

-- 11. WorkoutTemplates
CREATE TABLE WorkoutTemplates (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Name NVARCHAR(100) NOT NULL,
    Goal NVARCHAR(50) NOT NULL,
    Level NVARCHAR(30) NOT NULL,
    DaysCount INT NOT NULL,
    Description NVARCHAR(255),
    CreatedAt DATETIME DEFAULT GETDATE()
);

-- 12. WorkoutTemplateDays
CREATE TABLE WorkoutTemplateDays (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    TemplateId INT NOT NULL,
    DayNumber INT NOT NULL,
    Title NVARCHAR(50) NOT NULL,
    CONSTRAINT FK_TemplateDays_Template FOREIGN KEY (TemplateId) REFERENCES WorkoutTemplates(Id) ON DELETE CASCADE
);

-- 13. WorkoutTemplateExercises
CREATE TABLE WorkoutTemplateExercises (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    TemplateDayId INT NOT NULL,
    ExerciseName NVARCHAR(100) NOT NULL,
    ExerciseId INT NOT NULL,
    Sets INT NOT NULL,
    Reps INT NOT NULL,
    OrderIndex INT NOT NULL,
    CONSTRAINT FK_TemplateExercises_Day FOREIGN KEY (TemplateDayId) REFERENCES WorkoutTemplateDays(Id) ON DELETE CASCADE,
    CONSTRAINT FK_TemplateExercises_Exercise FOREIGN KEY (ExerciseId) REFERENCES Exercises(Id)
);

-- 14. UserWorkoutPlans
CREATE TABLE UserWorkoutPlans (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    UserId INT NOT NULL,
    Name NVARCHAR(100) NOT NULL,
    Goal NVARCHAR(50),
    Level NVARCHAR(30),
    DaysCount INT NOT NULL,
    Description NVARCHAR(255),
    CurrentDayIndex INT DEFAULT 1,
    IsActive BIT DEFAULT 1,
    CreatedAt DATETIME DEFAULT GETDATE(),
    UpdatedAt DATETIME NULL
);

-- Index for unique active plans
CREATE UNIQUE INDEX UQ_User_ActivePlan
ON UserWorkoutPlans(UserId)
WHERE IsActive = 1;

-- 15. UserWorkoutPlanDays
CREATE TABLE UserWorkoutPlanDays (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    UserWorkoutPlanId INT NOT NULL,
    DayIndex INT NOT NULL,
    Title NVARCHAR(50) NOT NULL,
    FOREIGN KEY (UserWorkoutPlanId) REFERENCES UserWorkoutPlans(Id) ON DELETE CASCADE,
    CONSTRAINT UQ_UserWorkout_Day UNIQUE (UserWorkoutPlanId, DayIndex),
    CONSTRAINT CHK_DayIndex_Positive CHECK (DayIndex > 0)
);

-- 16. UserWorkoutPlanExercises
CREATE TABLE UserWorkoutPlanExercises (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    UserWorkoutPlanDayId INT NOT NULL,
    ExerciseId INT NOT NULL,
    Sets INT NOT NULL,
    Reps INT NOT NULL,
    ExerciseName NVARCHAR(100),
    OrderIndex INT NOT NULL,
    FOREIGN KEY (UserWorkoutPlanDayId) REFERENCES UserWorkoutPlanDays(Id) ON DELETE CASCADE,
    FOREIGN KEY (ExerciseId) REFERENCES Exercises(Id),
    CONSTRAINT UQ_Day_Exercise_Order UNIQUE (UserWorkoutPlanDayId, OrderIndex),
    CONSTRAINT CHK_Sets_Reps CHECK (Sets > 0 AND Reps > 0)
);

-- 17. UserWorkoutSessions
CREATE TABLE UserWorkoutSessions (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    UserId INT NOT NULL,
    PlanId INT NOT NULL,
    DayIndex INT NOT NULL,
    Status NVARCHAR(20) DEFAULT 'in_progress',
    StartTime DATETIME DEFAULT GETDATE(),
    EndTime DATETIME NULL
);

-- 18. UserWorkoutSessionLogs
CREATE TABLE UserWorkoutSessionLogs (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    SessionId INT NOT NULL,
    ExerciseId INT NOT NULL,
    SetNumber INT NOT NULL,
    Reps INT NOT NULL,
    Weight FLOAT NULL,
    CreatedAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (SessionId) REFERENCES UserWorkoutSessions(Id) ON DELETE CASCADE
);
