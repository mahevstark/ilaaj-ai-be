const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();

function parseDateRange(query) {
  const { from, to } = query;
  let range = {};
  if (from) range.gte = new Date(from);
  if (to) range.lte = new Date(to);
  return Object.keys(range).length ? range : undefined;
}

function getDateRange(query) {
  const to = query.to ? new Date(query.to) : new Date();
  const from = query.from ? new Date(query.from) : new Date(to.getTime() - 29 * 24 * 60 * 60 * 1000);
  // Normalize to remove time for day buckets
  from.setHours(0, 0, 0, 0);
  to.setHours(23, 59, 59, 999);
  return { from, to };
}

function makeDateBuckets(from, to) {
  const buckets = [];
  const cursor = new Date(from);
  while (cursor <= to) {
    const key = cursor.toISOString().slice(0, 10); // YYYY-MM-DD
    buckets.push(key);
    cursor.setDate(cursor.getDate() + 1);
  }
  return buckets;
}

function countByDate(items) {
  const map = {};
  for (const it of items) {
    const key = new Date(it.createdAt).toISOString().slice(0, 10);
    map[key] = (map[key] || 0) + 1;
  }
  return map;
}

async function getAdminOverview(req, res) {
  try {
    const { country, search } = req.query;
    const { from, to } = getDateRange(req.query);
    const createdAtRange = { gte: from, lte: to };

    const userWhere = {
      ...(country ? { country } : {}),
      ...(createdAtRange ? { createdAt: createdAtRange } : {}),
      ...(search ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }] } : {})
    };

    const clinicRequestWhere = {
      ...(createdAtRange ? { createdAt: createdAtRange } : {}),
      ...(search ? { userEmail: { contains: search, mode: 'insensitive' } } : {})
    };

    const consultationWhere = {
      ...(createdAtRange ? { createdAt: createdAtRange } : {}),
      ...(search ? { patientName: { contains: search, mode: 'insensitive' } } : {})
    };

    const [totalUsers, totalSelectedClinic, totalArrangedMeeting, totalRequests, pendingRequests, onlineConsultations, usersRows, requestsRows, meetingsRows] = await Promise.all([
      prisma.user.count({ where: userWhere }),
      prisma.clinicRequest.count({ where: clinicRequestWhere }),
      prisma.consultation.count({ where: { ...consultationWhere, status: { in: ['SCHEDULED', 'CONFIRMED', 'COMPLETED'] } } }),
      prisma.clinicRequest.count({ where: clinicRequestWhere }),
      prisma.clinicRequest.count({ where: { ...clinicRequestWhere, status: 'PENDING' } }),
      prisma.consultation.count({ where: consultationWhere }),
      prisma.user.findMany({ where: userWhere, select: { id: true, name: true, email: true, country: true, createdAt: true } }),
      prisma.clinicRequest.findMany({ where: clinicRequestWhere, select: { id: true, userEmail: true, createdAt: true } }),
      prisma.consultation.findMany({ where: { ...consultationWhere, status: { in: ['SCHEDULED', 'CONFIRMED', 'COMPLETED'] } }, select: { id: true, patientName: true, createdAt: true, status: true } })
    ]);

    const days = makeDateBuckets(from, to);
    const usersByDate = countByDate(usersRows);
    const reqByDate = countByDate(requestsRows);
    const meetingsByDate = countByDate(meetingsRows);
    const series = days.map(d => ({ date: d, users: usersByDate[d] || 0, selectedClinic: reqByDate[d] || 0, arrangedMeeting: meetingsByDate[d] || 0 }));

    // Traffic by location (users by country)
    const trafficMap = {};
    for (const u of usersRows) {
      const key = u.country || 'Other';
      trafficMap[key] = (trafficMap[key] || 0) + 1;
    }
    const trafficByCountry = Object.entries(trafficMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    // Conversion funnel - proper funnel logic
    const totalPlans = await prisma.treatmentPlan.count({ where: { createdAt: createdAtRange } });
    const uploadedXray = await prisma.treatmentPlan.count({ where: { createdAt: createdAtRange, OR: [{ initialDataId: { not: null } }, { xrayUrl: { not: null } }, { hasXRay: true }] } });
    const clinicMatch = totalSelectedClinic; // patients who selected clinic
    
    // Proper funnel: each step is a percentage of the previous step
    const conversion = {
      startedPlan: 100, // Always 100% for the first step
      uploadedXray: totalPlans > 0 ? Math.round((uploadedXray / totalPlans) * 100) : 0,
      clinicMatch: uploadedXray > 0 ? Math.round((clinicMatch / uploadedXray) * 100) : 0
    };

    // Activities (latest from consultations and clinic requests)
    const [recentConsultations, recentRequests] = await Promise.all([
      prisma.consultation.findMany({ where: consultationWhere, orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, patientName: true, createdAt: true, status: true } }),
      prisma.clinicRequest.findMany({ where: clinicRequestWhere, orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, userEmail: true, createdAt: true, status: true } })
    ]);
    const activities = [...recentConsultations.map(c => ({
      id: `consultation-${c.id}`,
      manager: c.patientName || 'Consultation',
      date: new Date(c.createdAt).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      }),
      time: new Date(c.createdAt).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      }),
      createdAt: c.createdAt,
      status: c.status || 'SCHEDULED'
    })), ...recentRequests.map(r => ({
      id: `request-${r.id}`,
      manager: r.userEmail || 'Clinic Request',
      date: new Date(r.createdAt).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      }),
      time: new Date(r.createdAt).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      }),
      createdAt: r.createdAt,
      status: r.status || 'PENDING'
    }))].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);

    res.json({
      success: true,
      data: {
        totals: {
          totalSignedInUsers: totalUsers,
          totalEnquiries: {
            selectedClinic: totalSelectedClinic,
            arrangedMeeting: totalArrangedMeeting
          },
          totalRequests: totalRequests,
          pendingRequests: pendingRequests,
          totalConsultations: onlineConsultations
        },
        series,
        trafficByCountry,
        conversion,
        activities,
        range: { from: from.toISOString(), to: to.toISOString() }
      }
    });
  } catch (error) {
    console.error('Error in getAdminOverview:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch admin overview', error: error.message });
  }
}

async function exportAdminOverview(req, res) {
  try {
    const { format = 'csv' } = req.query;
    const { data } = await (async () => {
      const fakeReq = { ...req };
      const results = await getMetricsForExport(fakeReq);
      return { data: results };
    })();

    if (format === 'csv') {
      const rows = data.rows || [];
      if (!rows.length) {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="admin-overview.csv"');
        return res.send('');
      }
      const headers = Object.keys(rows[0]);
      const escape = (v) => {
        if (v === null || v === undefined) return '';
        const s = String(v).replace(/"/g, '""');
        return /[",\n]/.test(s) ? `"${s}"` : s;
      };
      const csv = [headers.join(',')] 
        .concat(rows.map(r => headers.map(h => escape(r[h])).join(',')))
        .join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="admin-overview.csv"');
      return res.send(csv);
    }

    // default JSON
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error in exportAdminOverview:', error);
    res.status(500).json({ success: false, message: 'Failed to export admin overview', error: error.message });
  }
}

async function getMetricsForExport(req) {
  const { country, search } = req.query;
  const createdAtRange = parseDateRange(req.query);

  const where = {
    ...(country ? { country } : {}),
    ...(createdAtRange ? { createdAt: createdAtRange } : {}),
    ...(search ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }] } : {})
  };

  const users = await prisma.user.findMany({ where, select: { id: true, name: true, email: true, country: true, createdAt: true } });
  return { rows: users };
}

module.exports = { getAdminOverview, exportAdminOverview };


