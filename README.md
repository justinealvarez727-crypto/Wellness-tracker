# Nutrition, fasting & workout tracker (PWA)

Static app: no build step. Data is stored on the device (localStorage).

## Run locally
`npx serve .` then open the shown address.

## Put it on GitHub
1. Create an empty repository on GitHub.
2. In this folder: `git init && git add . && git commit -m "first version" && git branch -M main`
3. `git remote add origin <your-repo-url> && git push -u origin main`

## Deploy on Vercel
1. vercel.com > Add New > Project > import the GitHub repository.
2. Framework preset: **Other**. Leave Build Command and Output Directory empty. Deploy.
3. Open the Vercel link on your phone and use "Add to Home Screen" to install it.

## Built so far
Today dashboard (ring flip, macro pager), water, fast timer, meal logging, steps entry, Workout (routines, active workout with rest timer, history, Workout Progress), Progress tab with weight log, goal, graph and BMI, Me tab with goals (calculated, custom, zigzag, track), an exercise library with custom exercises, Kitchen (recipes, ingredients, pantry), meal estimate from a built-in food table, workout planner, the steps sheet, and meals (Advance log, Backfill, Recent logs, meal detail, Edit meal, Re-log), fast scheduling, missed fast, plan edit, full view, fasting history, and water history, routine editing, exercise menu, and Progress extras (charts, averages, coach, Macro Journal, report, photos), warm-up/cool-down sections, and the Progress weekly overview calendar, recipe components, steps minutes with calories, Move kcal, reset-time day start, and a body diagram on Workout Progress, plus photos on meals and custom exercises.
