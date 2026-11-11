export interface BackendClass {
  id: string;
  name: string;
  totalSeats: number;
}

export interface BackendHold {
  id: string;
  classId: string;
  studentId: string;
  status: 'HELD' | 'CONFIRMED' | 'EXPIRED' | 'CANCELLED';
  createdAt: string;
  expiresAt: string;
}

export class TestBackendServer {
  public classes: BackendClass[] = [];
  public holds: BackendHold[] = [];
  public holdDurationSeconds: number = 600;

  public reset() {
    this.classes = [];
    this.holds = [];
    this.holdDurationSeconds = 600;
  }

  public handle = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const urlStr = typeof input === 'string' ? input : input.toString();
    const url = new URL(urlStr, 'http://localhost:8080');
    const path = url.pathname;
    const method = (init?.method || 'GET').toUpperCase();
    const headers = new Headers(init?.headers);
    const studentId = headers.get('X-Student-Id');

    // 1. POST /classes
    if (path === '/classes' && method === 'POST') {
      const body = JSON.parse(init?.body as string);
      if (!body.name || body.totalSeats <= 0) {
        return new Response(JSON.stringify({ message: 'Invalid class payload' }), { status: 400 });
      }
      const newClass: BackendClass = {
        id: `c_${Math.random().toString(36).substring(2, 9)}`,
        name: body.name.trim(),
        totalSeats: body.totalSeats,
      };
      this.classes.push(newClass);
      return new Response(JSON.stringify(newClass), { status: 201 });
    }

    // 2. GET /classes
    if (path === '/classes' && method === 'GET') {
      const now = Date.now();
      const result = this.classes.map((c) => {
        const held = this.holds.filter(
          (h) => h.classId === c.id && h.status === 'HELD' && new Date(h.expiresAt).getTime() > now
        ).length;
        const confirmed = this.holds.filter(
          (h) => h.classId === c.id && h.status === 'CONFIRMED'
        ).length;
        return {
          id: c.id,
          name: c.name,
          totalSeats: c.totalSeats,
          heldSeats: held,
          confirmedSeats: confirmed,
          availableSeats: c.totalSeats - held - confirmed,
        };
      });
      return new Response(JSON.stringify(result), { status: 200 });
    }

    // 3. POST /classes/:classId/holds
    const holdMatch = path.match(/^\/classes\/([^/]+)\/holds$/);
    if (holdMatch && method === 'POST') {
      const classId = holdMatch[1];
      if (!studentId || !/^\d{17}$/.test(studentId)) {
        return new Response(JSON.stringify({ message: 'X-Student-Id must be exactly 17 digits.' }), { status: 400 });
      }

      const cls = this.classes.find((c) => c.id === classId);
      if (!cls) {
        return new Response(JSON.stringify({ message: 'Class not found.' }), { status: 404 });
      }

      const now = Date.now();
      const activeCount = this.holds.filter(
        (h) => h.classId === classId && ((h.status === 'HELD' && new Date(h.expiresAt).getTime() > now) || h.status === 'CONFIRMED')
      ).length;

      if (activeCount >= cls.totalSeats) {
        return new Response(JSON.stringify({ message: 'No seats available in this class.' }), { status: 409 });
      }

      const alreadyApplied = this.holds.some(
        (h) => h.classId === classId && h.studentId === studentId && ((h.status === 'HELD' && new Date(h.expiresAt).getTime() > now) || h.status === 'CONFIRMED')
      );

      if (alreadyApplied) {
        return new Response(JSON.stringify({ message: 'You already have an active application for this class.' }), { status: 409 });
      }

      const createdAt = new Date().toISOString();
      const expiresAt = new Date(Date.now() + this.holdDurationSeconds * 1000).toISOString();

      const newHold: BackendHold = {
        id: `h_${Math.random().toString(36).substring(2, 9)}`,
        classId,
        studentId,
        status: 'HELD',
        createdAt,
        expiresAt,
      };

      this.holds.push(newHold);
      return new Response(
        JSON.stringify({
          holdId: newHold.id,
          classId: newHold.classId,
          studentId: newHold.studentId,
          status: newHold.status,
          expiresAt: newHold.expiresAt,
        }),
        { status: 201 }
      );
    }

    const getHoldMatch = path.match(/^\/holds\/([^/]+)$/);
    if (getHoldMatch && method === 'GET') {
      const holdId = getHoldMatch[1];
      const hold = this.holds.find((h) => h.id === holdId);
      if (!hold) {
        return new Response(JSON.stringify({ message: 'Hold not found.' }), { status: 404 });
      }
      const isExpired = hold.status === 'HELD' && new Date(hold.expiresAt).getTime() <= Date.now();
      return new Response(
        JSON.stringify({
          holdId: hold.id,
          classId: hold.classId,
          status: isExpired ? 'EXPIRED' : hold.status,
          expiresAt: hold.expiresAt,
        }),
        { status: 200 }
      );
    }

    const confirmMatch = path.match(/^\/holds\/([^/]+)\/confirm$/);
    if (confirmMatch && method === 'POST') {
      const holdId = confirmMatch[1];
      const hold = this.holds.find((h) => h.id === holdId);
      if (!hold) return new Response(JSON.stringify({ message: 'Hold not found.' }), { status: 404 });
      if (hold.studentId !== studentId) return new Response(JSON.stringify({ message: 'Forbidden' }), { status: 403 });

      if (hold.status === 'CONFIRMED') {
        return new Response(JSON.stringify({ holdId, status: 'CONFIRMED' }), { status: 200 });
      }

      if (hold.status === 'HELD' && new Date(hold.expiresAt).getTime() > Date.now()) {
        hold.status = 'CONFIRMED';
        return new Response(JSON.stringify({ holdId, status: 'CONFIRMED' }), { status: 200 });
      }

      return new Response(JSON.stringify({ message: 'Hold expired or cancelled' }), { status: 409 });
    }

    const cancelMatch = path.match(/^\/holds\/([^/]+)$/);
    if (cancelMatch && method === 'DELETE') {
      const holdId = cancelMatch[1];
      const hold = this.holds.find((h) => h.id === holdId);
      if (!hold) return new Response(JSON.stringify({ message: 'Hold not found.' }), { status: 404 });
      if (hold.studentId !== studentId) return new Response(JSON.stringify({ message: 'Forbidden' }), { status: 403 });

      if (hold.status === 'CONFIRMED') {
        return new Response(JSON.stringify({ message: 'A confirmed application cannot be cancelled.' }), { status: 409 });
      }

      hold.status = 'CANCELLED';
      return new Response(null, { status: 204 });
    }

    if (path === '/me/holds' && method === 'GET') {
      if (!studentId || !/^\d{17}$/.test(studentId)) {
        return new Response(JSON.stringify({ message: 'X-Student-Id required.' }), { status: 400 });
      }

      const now = Date.now();
      const my = this.holds
        .filter((h) => h.studentId === studentId)
        .map((h) => {
          const cls = this.classes.find((c) => c.id === h.classId);
          const status = h.status === 'HELD' && new Date(h.expiresAt).getTime() <= now ? 'EXPIRED' : h.status;
          return {
            holdId: h.id,
            classId: h.classId,
            className: cls?.name || 'Class',
            status,
            expiresAt: h.expiresAt,
          };
        });

      return new Response(JSON.stringify(my), { status: 200 });
    }

    return new Response(JSON.stringify({ message: 'Not found' }), { status: 404 });
  };
}

export const testBackend = new TestBackendServer();

