const fs = require('fs');
const content = fs.readFileSync('c:/Users/HP/Documents/Capstone/Faithly/faithlyweb/server/src/routes/savings.js', 'utf8');
const lines = content.split('\n');
lines.forEach((line, i) => {
    if (line.includes('goals') && !line.includes('const goals') && !line.includes('let goals') && !line.includes('savingsGoals') && !line.includes('activeGoals') && !line.includes('completedGoals') && !line.includes('totalGoalCount') && !line.includes('goals:') && !line.includes('goalStats') && !line.includes('goalId')) {
        console.log(`Line ${i + 1}: ${line.trim()}`);
    }
});
