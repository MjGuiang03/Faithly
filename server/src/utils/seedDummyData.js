import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGODB_URL = process.env.MONGODB_URL;
const DB_NAME = process.env.DB_NAME;

if (!MONGODB_URL) {
  console.error("❌ MONGODB_URL not found in .env");
  process.exit(1);
}

// ── Data References ──
const COMMUNITIES = [
  'Tabuk', 'Zapote', 'Bliss', 'Libanon', 'Batong Buhay', 'Balatoc', 'Lat-nog',
  'Santiago City', 'Lamao', 'Lingey', 'Cabaruyan', 'Ducligan', 'Gangal', 'Bila-Bila',
  'Naguillian', 'Ud-udiao', 'Villa Conchita', 'Ay-yeng Manabo', 'Dao-angan',
  'Kilong-olao', 'Bao-yan', 'Amti', 'Danac', 'Bengued', 'Sappaac', 'Saccaang',
  'Baguio', 'Montalban', 'Valenzuela City', 'Tandang Sora, Quezon City',
  'COA, Quezon City', 'Payatas, Quezon City', 'Malaria, Caloocan', 'Meycauayan City',
  'Camalig', 'San Jose Del Monte', 'Pacpaco, San Manuel', 'Victoria', 'Bambanaba, Cuyapo',
  'Dagupan', 'Mangatarem', 'Laoak Langka', 'Orbiztondo', 'Malasique, Bolaoit', 'Taloyan',
  'Binmaley', 'San Carlos', 'Manaoag', 'Pozorrobio', 'Alcala', 'Butuan City', 'RTR',
  'Jabonga, Bangonay', 'Kasiklan', 'San Mateo', 'Fatima Kim.13', 'Bayugan', 'Ibuan',
  'Balubo', 'Alegria', 'Bonifacio', 'Matin-ao', 'Ipil', 'Kinabigtasan Tago', 'Mandaue',
  'Li-loan', 'Calero', 'Compostela'
];

const FIRST_NAMES = ['Juan', 'Maria', 'Jose', 'Ana', 'Pedro', 'Rosa', 'Luis', 'Carmen', 'Carlos', 'Teresa', 'Miguel', 'Lourdes', 'Antonio', 'Cristina', 'Manuel', 'Elena', 'Francisco', 'Margarita', 'Rafael', 'Lucia', 'Ramon', 'Beatriz', 'Fernando', 'Gloria', 'Eduardo', 'Silvia', 'Mario', 'Victoria', 'Jorge', 'Cecilia', 'Ricardo', 'Raquel', 'Roberto', 'Patricia', 'Alberto', 'Angela', 'Emilio', 'Consuelo', 'Victor', 'Dolores'];
const LAST_NAMES = ['Dela Cruz', 'Santos', 'Reyes', 'Cruz', 'Bautista', 'Ocampo', 'Garcia', 'Mendoza', 'Torres', 'Tomas', 'Andrada', 'Castillo', 'Flores', 'Villanueva', 'Perez', 'Gonzales', 'Rodriguez', 'Lopez', 'Fernandez', 'Gomez', 'Marquez', 'Aquino', 'Navarro', 'Ramos', 'Guzman', 'Velasco', 'Castro', 'Rivera', 'Diaz', 'Sison'];
const CATEGORIES = ['Tithes', 'Offering', 'Missions', 'Building Fund', 'General Fund'];
const SAVINGS_CATEGORIES = ['Emergency Fund', 'Education Fund', 'Medical Fund', 'Home Improvement', 'Business Capital', 'Travel Fund'];
const SERVICE_TYPES = ["Sunday Worship", "Bible Study", "Prayer Meeting", "Youth Service", "Special Event", "Women's Fellowship", "Men's Fellowship"];

const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Generate dates specifically patterned for presentation
const randomDate = (startMonth, endMonth, isSpike = false, spikeMonth = 4) => {
  // spikeMonth: 0-indexed (4 = May)
  let m;
  if (isSpike && Math.random() < 0.6) {
    m = spikeMonth;
  } else {
    m = randomInt(startMonth, endMonth);
  }
  const d = randomInt(1, 28);
  return new Date(2026, m, d, randomInt(7, 20), randomInt(0, 59), randomInt(0, 59));
};

async function run() {
  const client = new MongoClient(MONGODB_URL);
  
  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");
    const db = client.db(DB_NAME);

    const hashedPwd = await bcrypt.hash('Mjguiang03!', 12);
    const usersCount = randomInt(100, 150);

    console.log(`⏳ Seeding ${usersCount} users...`);
    const users = [];
    for (let i = 0; i < usersCount; i++) {
      const fn = getRandom(FIRST_NAMES);
      const ln = getRandom(LAST_NAMES);
      const email = `${fn.toLowerCase()}.${ln.toLowerCase().replace(/ /g, '')}${randomInt(1,9999)}@example.com`;
      
      const isOfficer = Math.random() < 0.55;
      const isActive = Math.random() < 0.8;
      const createdAt = randomDate(0, 4, true, 4); // Jan-May, May spike

      users.push({
        fullName: `${fn} ${ln}`,
        email: email,
        passwordHash: hashedPwd,
        branch: getRandom(COMMUNITIES),
        role: isOfficer ? 'officer' : 'member',
        status: isActive ? 'active' : 'inactive',
        memberId: `M-${randomInt(100000, 999999)}`,
        createdAt: createdAt
      });
    }
    const userRes = await db.collection('users').insertMany(users);
    const userMap = Object.values(userRes.insertedIds).map((id, idx) => ({ _id: id, ...users[idx] }));
    console.log(`✅ Users inserted: ${userMap.length}`);

    // DONATIONS
    const donationsCount = randomInt(150, 200);
    console.log(`⏳ Seeding ${donationsCount} donations...`);
    const donations = [];
    let donationCounter = await db.collection('donations').countDocuments();

    for (let i = 0; i < donationsCount; i++) {
      const user = getRandom(userMap);
      donationCounter++;
      const donationId = `D-2026-${String(donationCounter).padStart(3, '0')}`;
      
      const isAlegriaOrValenzuela = Math.random() < 0.4;
      const dBranch = isAlegriaOrValenzuela ? getRandom(['Alegria', 'Valenzuela City']) : (Math.random() < 0.8 ? user.branch : getRandom(COMMUNITIES));
      
      const isMaySpike = Math.random() < 0.5;
      let dMonth;
      if (isMaySpike) dMonth = 4; // May
      else if (Math.random() < 0.2) dMonth = 5; // Jun dip
      else dMonth = getRandom([0, 1, 2, 3, 6, 7]); // other months
      
      const dDate = new Date(2026, dMonth, randomInt(1, 28), randomInt(8, 20), randomInt(0, 59));
      const method = Math.random() < 0.35 ? 'Bank Transfer' : 'E-Wallet';
      const status = Math.random() < 0.85 ? 'confirmed' : 'rejected';

      donations.push({
        donationId,
        email: user.email,
        member: user.fullName,
        amount: randomInt(50, 800),
        category: getRandom(CATEGORIES),
        community: dBranch,
        method: method,
        type: 'One-time',
        status: status,
        date: dDate,
        createdAt: dDate
      });
    }
    await db.collection('donations').insertMany(donations);
    console.log(`✅ Donations inserted: ${donations.length}`);

    // SAVINGS GOALS
    const goalsCount = randomInt(40, 60);
    console.log(`⏳ Seeding ${goalsCount} savings goals...`);
    const goals = [];
    const savedGoalMap = []; // user email -> goal details

    for (let i = 0; i < goalsCount; i++) {
      const user = getRandom(userMap);
      const createdAt = randomDate(0, 3); // Jan-Apr
      
      const goal = {
        email: user.email,
        goalName: getRandom(SAVINGS_CATEGORIES),
        targetAmount: randomInt(10, 300) * 100, // 1,000 to 30,000
        currentAmount: 0,
        status: Math.random() < 0.7 ? 'active' : 'completed',
        createdAt: createdAt
      };
      goals.push(goal);
    }
    const goalRes = await db.collection('savings_goals').insertMany(goals);
    
    // SAVINGS DEPOSITS
    const depositsCount = randomInt(80, 120);
    console.log(`⏳ Seeding ${depositsCount} savings deposits...`);
    const deposits = [];
    
    for (let i = 0; i < depositsCount; i++) {
      const gIdx = randomInt(0, goals.length - 1);
      const goal = goals[gIdx];
      const goalId = Object.values(goalRes.insertedIds)[gIdx];

      const amount = randomInt(2, 5) * 100; // 200 - 500
      goal.currentAmount += amount;

      const date = randomDate(1, 7); // Feb-Aug

      deposits.push({
        email: goal.email,
        goalId: goalId,
        type: 'deposit',
        amount: amount,
        method: Math.random() < 0.35 ? 'Bank Transfer' : 'E-Wallet',
        status: 'confirmed',
        date: date,
        createdAt: date
      });
    }

    // Update goals currentAmount
    for (let i = 0; i < goals.length; i++) {
      const goalId = Object.values(goalRes.insertedIds)[i];
      await db.collection('savings_goals').updateOne({ _id: goalId }, { $set: { currentAmount: goals[i].currentAmount } });
      savedGoalMap.push({ email: goals[i].email, savedAmount: goals[i].currentAmount });
    }
    await db.collection('savings_transactions').insertMany(deposits);
    console.log(`✅ Savings deposits inserted: ${deposits.length}`);

    // LOANS
    const loansCount = randomInt(30, 40);
    console.log(`⏳ Seeding ${loansCount} loans...`);
    const loans = [];
    const validOfficers = userMap.filter(u => u.role === 'officer' && savedGoalMap.some(g => g.email === u.email && g.savedAmount > 0));
    
    if (validOfficers.length === 0) {
      console.warn("⚠️ No officers with savings found, unable to seed loans!");
    } else {
      let loanCounter = await db.collection('loans').countDocuments();
      const disbursedLoansForPayments = [];

      for (let i = 0; i < Math.min(loansCount, validOfficers.length * 2); i++) {
        const user = getRandom(validOfficers);
        const userSavings = savedGoalMap.find(g => g.email === user.email).savedAmount;
        loanCounter++;
        const loanId = `LN-2026-${String(loanCounter).padStart(5, '0')}`;
        
        const amount = Math.min(randomInt(10, 50) * 100, userSavings * 2);
        const type = Math.random() < 0.4 ? 'Personal Loan' : (Math.random() < 0.67 ? 'Emergency Loan' : 'Short-Term Loan');
        const appliedDate = randomDate(0, 7, true, 3); // Peak in Apr-May (3-4)

        const r = Math.random();
        let status = 'Pending';
        if (r < 0.35) status = 'Completed';
        else if (r < 0.65) status = 'Active';
        else if (r < 0.80) status = 'Approved';
        else if (r < 0.90) status = 'Rejected';

        const loanDoc = {
          loanId,
          email: user.email,
          memberName: user.fullName,
          community: user.branch,
          loanAmount: amount,
          loanType: type,
          status,
          appliedDate,
          loanTerm: randomInt(3, 12),
          interestRate: 2.5
        };

        if (status === 'Active' || status === 'Completed') {
          loanDoc.disbursementDate = new Date(appliedDate.getTime() + 86400000 * randomInt(2, 7)); // disbursed days later
          loanDoc.disbursementMethod = Math.random() < 0.3 ? 'Bank Transfer' : (Math.random() < 0.7 ? 'E-Wallet' : 'Cash');
          disbursedLoansForPayments.push(loanDoc);
        }
        
        loans.push(loanDoc);
      }
      const loanRes = await db.collection('loans').insertMany(loans);
      console.log(`✅ Loans inserted: ${loans.length}`);

      // LOAN PAYMENTS
      console.log(`⏳ Seeding loan payments...`);
      const payments = [];
      for (const l of disbursedLoansForPayments) {
        const pmts = randomInt(1, Math.min(l.loanTerm, 6)); // Make some payments
        const monthlyAmo = (l.loanAmount + (l.loanAmount * l.interestRate/100)) / l.loanTerm;
        
        for (let j = 1; j <= pmts; j++) {
          const pDate = new Date(l.disbursementDate);
          pDate.setMonth(pDate.getMonth() + j);
          
          if (pDate > new Date(2026, 7, 31)) break; // Stop if past Aug

          const isLate = Math.random() < 0.1;

          payments.push({
            loanId: l.loanId,
            email: l.email,
            amount: parseFloat(monthlyAmo.toFixed(2)),
            date: pDate,
            status: isLate ? 'late' : 'confirmed',
            method: Math.random() < 0.35 ? 'Bank Transfer' : 'E-Wallet',
            createdAt: pDate
          });
        }
      }
      if (payments.length > 0) {
        await db.collection('loan_payments').insertMany(payments);
        console.log(`✅ Loan Payments inserted: ${payments.length}`);
      }
    }

    // ATTENDANCE
    const attCount = randomInt(200, 300);
    console.log(`⏳ Seeding ${attCount} attendance sessions/records...`);
    
    // Group into sessions
    const numSessions = Math.floor(attCount / 10);
    const attendanceRecords = [];
    let sessionIdCount = 1000;

    for (let i = 0; i < numSessions; i++) {
      sessionIdCount++;
      const isTopAttendance = Math.random() < 0.4;
      const aBranch = isTopAttendance ? getRandom(['Santiago City', 'Alcala']) : getRandom(COMMUNITIES);
      const isMaySpike = Math.random() < 0.3; // Spike for May Special Event
      
      const month = isMaySpike ? 4 : getRandom([0, 1, 2, 5, 6, 7]);
      const date = new Date(2026, month, randomInt(1, 28));
      
      const sType = isMaySpike ? 'Special Event' : getRandom(SERVICE_TYPES);
      
      // select 5-15 users from this branch
      const branchUsers = userMap.filter(u => u.branch === aBranch);
      if (branchUsers.length === 0) continue;

      const attsThisSession = randomInt(5, Math.min(15, branchUsers.length));
      // shuffle and take first N
      const selected = [...branchUsers].sort(() => 0.5 - Math.random()).slice(0, attsThisSession);
      
      for (const u of selected) {
        const isPresent = Math.random() < 0.85;
        let timeInStr = '';
        if (isPresent) {
          const isMorning = Math.random() < 0.6;
          const h = isMorning ? randomInt(7, 10) : randomInt(17, 18);
          const m = String(randomInt(0, 59)).padStart(2, '0');
          const p = h >= 12 ? 'PM' : 'AM';
          const hr = h > 12 ? h - 12 : h;
          timeInStr = `${hr}:${m} ${p}`;
        }

        attendanceRecords.push({
          email: u.email,
          member: u.fullName,
          service: sType,
          community: aBranch,
          status: isPresent ? 'Present' : 'Absent',
          timeIn: timeInStr,
          date: date.toISOString().split('T')[0],
          sessionId: `SESS-${sessionIdCount}`,
          createdAt: date
        });
      }
    }
    
    if (attendanceRecords.length > 0) {
      await db.collection('attendance').insertMany(attendanceRecords);
      console.log(`✅ Attendance records inserted: ${attendanceRecords.length}`);
    }

    console.log("🎉 SEEDING COMPLETE!");
  } catch (err) {
    console.error("❌ Seeding Error:", err);
  } finally {
    await client.close();
  }
}

run();
