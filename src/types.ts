export type Role = 'ADMIN' | 'DOCENTE' | 'COBRANZA';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar_url?: string;
  avatarFile?: File;
}

export interface StudentDebt {
  studentId: string;
  firstName: string;
  lastName: string;
  enrollment: string;
  period: string;
  year: number;
  status: 'active' | 'inactive';
  campus: string;
  type: string;
  discount: number;
  tuitionDebt: number;      // Colegiatura
  powerCourseDebt: number;  // Curso de Potencia
  adminDebt: number;        // Gastos Administrativos
  reinstatementDebt: number; // Reincorporación (REVOE)
  otherDebt: number;
  total: number;
  debtDate: string; // ISO format YYYY-MM-DD
}

export interface Student {
  id: string;
  name: string;
  enrollment: string;
  career: string;
  semester: string;
  group: string;
  status: 'active' | 'inactive';
  modality: 'Escolarizada' | 'Ejecutiva' | 'Sabatina';
  avatar_url?: string;
}

export interface Teacher {
  id: string;
  name: string;
  employeeId: string;
  specialty: string;
  email: string;
  avatar_url?: string;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  semester: string;
  credits: number;
  teacher?: string;
  evaluationProgress?: number;
  career?: string;
  isCommonCore?: boolean;
  studentsCount?: number;
  group_id?: string;
}

export interface Group {
  id: string;
  name: string;
  subject: string;
  teacher: string;
  studentsCount: number;
  semester: string;
  career: string;
  modality: 'Escolarizada' | 'Ejecutiva' | 'Sabatina';
  team_created?: boolean;
  ms_team_id?: string;
  azure_group_id?: string;
  teams_id?: string;
  is_teams_active?: boolean;
  provisioned_at?: string;
  status?: string;
}

export interface Grade {
  studentId: string;
  studentName: string;
  enrollment: string;
  p1: number;
  p2: number;
  p3: number;
  average: number;
  status: 'approved' | 'failed';
}

export interface AttendanceRecord {
  studentId: string;
  studentName: string;
  enrollment?: string;
  status: 'present' | 'absent' | 'late';
}

export interface SubjectCriterion {
  id: string;
  name: string;
  weight: number;
  scope: 'all' | 1 | 2 | 3;
}

export interface RubricCriterion {
  id: string;
  name: string;
  weight: number; // Percentage (0-100)
}

export interface Rubric {
  id: string;
  rubricName: string;
  criterionId: string;
  criteria: RubricCriterion[];
}

export interface StudentGrade {
  criterionId: string;
  score: number; // 0-10
}

export interface Evaluation {
  id: string;
  studentId: string;
  studentName?: string;
  rubricId: string;
  scores: Record<string, number>; // criterionId -> score
  totalScore: number;
  status: 'pending' | 'completed';
  feedback?: string;
}
