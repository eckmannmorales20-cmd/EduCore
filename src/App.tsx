/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Layout } from './components/Layout';
import { AdminDashboard } from './components/AdminDashboard';
import { TeacherDashboard } from './components/TeacherDashboard';
import { ManagementTable } from './components/ManagementTable';
import { GradeCapture } from './components/GradeCapture';
import { GroupManagement } from './components/GroupManagement';
import { CollectionsDashboard } from './components/CollectionsDashboard';
import { SettingsView } from './components/SettingsView';
import { SubjectEvaluationModal } from './components/SubjectEvaluationModal';
import { AssignSubjectModal } from './components/AssignSubjectModal';
import { GroupDetailsModal } from './components/GroupDetailsModal';
import { Login } from './components/Login';
import { ManagementModal } from './components/ManagementModal';
import ConfirmationModal from './components/ConfirmationModal';
import TeamsCreationStepper from './components/TeamsCreationStepper';
import { Toast, ToastType } from './components/Toast';
import { User, Student, Teacher, Group, Subject, Rubric, Evaluation, SubjectCriterion, StudentDebt } from './types';
import { cn } from './lib/utils';
import { BarChart3, Eye, Plus, X, Check, User as UserIcon, UserPlus, ArrowLeft, Users, BookOpen, Loader2, Shield, CheckSquare, Square, ChevronDown, ChevronUp, Edit2, MessageSquare } from 'lucide-react';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { initializeMsal } from './lib/azure-auth';
import { MicrosoftTeamsService } from './services/microsoftGraph.service';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { motion } from 'motion/react';

// Mock Data removed

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [role, setRole] = useState<User['role']>('ADMIN');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [managedGroup, setManagedGroup] = useState<any>(null);
  const [partialGrades, setPartialGrades] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedSubjectData, setSelectedSubjectData] = useState<{
    rubrics: Rubric[];
    evaluations: Evaluation[];
    subjectCriteria: SubjectCriterion[];
    students: Student[];
  } | null>(null);
  const [loadingSubjectData, setLoadingSubjectData] = useState(false);
  const [selectedGroupDetails, setSelectedGroupDetails] = useState<Group | null>(null);
  const [selectedTeamGroup, setSelectedTeamGroup] = useState<Group | null>(null);
  const [teamFilter, setTeamFilter] = useState<'pending' | 'created'>('pending');
  const [selectedTeamOwners, setSelectedTeamOwners] = useState<string[]>([]);
  const [isHeadsDropdownOpen, setIsHeadsDropdownOpen] = useState(false);
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);
  const [showTeamsStepper, setShowTeamsStepper] = useState(false);
  const [stepperData, setStepperData] = useState<any>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [selectedTeacherForAssignment, setSelectedTeacherForAssignment] = useState<Teacher | null>(null);
  const [loading, setLoading] = useState(true);
  const [isManagementModalOpen, setIsManagementModalOpen] = useState(false);
  const [managementModalType, setManagementModalType] = useState<'student' | 'teacher' | 'career' | 'subject' | 'group'>('student');
  const [editingItem, setEditingItem] = useState<any>(null);
  const [notification, setNotification] = useState<{ message: string; type: ToastType; isOpen: boolean }>({
    message: '',
    type: 'success',
    isOpen: false
  });
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [careers, setCareers] = useState<any[]>([]);
  const [debts, setDebts] = useState<StudentDebt[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [rendimientoData, setRendimientoData] = useState<any[]>([]);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [viewSubjectDetails, setViewSubjectDetails] = useState<Subject | null>(null);
  const [subjectEnrollments, setSubjectEnrollments] = useState<any[]>([]);

  const cleanText = (str: any) => {
    if (!str) return '';
    return String(str)
      .replace(/Ã¡/g, 'a').replace(/Ã©/g, 'e').replace(/Ã­/g, 'i').replace(/Ã³/g, 'o').replace(/Ãº/g, 'u').replace(/Ã±/g, 'n')
      .replace(/Ã/g, 'a')
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, ' ')
      .replace(/\b(de|en|la|los|el|para|y|con|del)\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const getSemesters = (v: any): number[] => {
    if (v === null || v === undefined) return [0];
    const matches = String(v).match(/\d+/g);
    if (!matches) return [0];
    return matches.map(n => Number(n));
  };

  // Fetch data for selected subject modal
  React.useEffect(() => {
    const fetchSubjectDetails = async () => {
      if (!selectedSubject) {
        setSelectedSubjectData(null);
        return;
      }

      setLoadingSubjectData(true);
      try {
        const [
          { data: rubricsData },
          { data: evaluationsData },
          { data: criteriaData }
        ] = await Promise.all([
          supabase.from('rubrics').select('*').eq('subject_id', selectedSubject.id),
          supabase.from('evaluations').select('*, rubrics!inner(subject_id)').eq('rubrics.subject_id', selectedSubject.id),
          supabase.from('subject_criteria').select('*').eq('subject_id', selectedSubject.id)
        ]);

        // Fetch rubric criteria for each rubric
        let allRubrics: Rubric[] = [];
        if (rubricsData && rubricsData.length > 0) {
          const rubricIds = rubricsData.map(r => r.id);
          const { data: rubricCriteriaData } = await supabase
            .from('rubric_criteria')
            .select('*')
            .in('rubric_id', rubricIds);

          allRubrics = rubricsData.map(r => ({
            id: r.id,
            rubricName: r.name,
            criterionId: r.criterion_id,
            criteria: (rubricCriteriaData || [])
              .filter(rc => rc.rubric_id === r.id)
              .map(rc => ({
                id: rc.id,
                name: rc.name,
                weight: rc.weight
              }))
          }));
        }

        // Filter students for this subject
        console.log('Filtering students for subject:', selectedSubject.name, selectedSubject.id);
        
        const getSemesters = (v: any): number[] => {
          if (v === null || v === undefined) return [0];
          // Extract all numbers from the string (e.g., "7 y 8" -> [7, 8])
          const matches = String(v).match(/\d+/g);
          if (!matches) return [0];
          return matches.map(n => Number(n));
        };

        const subjectGroups = groups.filter(g => {
          const sId = String(selectedSubject.id);
          const gSubjectId = g.subject_id || g.subjectId;
          const isDirectLink = (gSubjectId && String(gSubjectId) === sId);
          
          const gSubject = (g.subject || g.materia || '').toLowerCase().trim();
          const sName = (selectedSubject.name || '').toLowerCase().trim();
          const isNameLink = gSubject !== '' && sName !== '' && (gSubject === sName || gSubject.includes(sName) || sName.includes(gSubject));
          
          const sTeacherId = selectedSubject.teacher_id || selectedSubject.teacherId;
          const gTeacherId = g.teacher_id || g.teacherId;
          
          const matchesTeacher = (gTeacherId && sTeacherId && String(gTeacherId) === String(sTeacherId)) ||
                                (g.teacher && selectedSubject.teacher && g.teacher.toLowerCase().trim() === selectedSubject.teacher.toLowerCase().trim());
          
          // Use both semester field and group name as sources for semester info
          const gSemesters = getSemesters(g.semester || g.name);
          const sSemesters = getSemesters(selectedSubject.semester);
          const matchesSemester = gSemesters.some(sem => sSemesters.includes(sem));
          
          const sCareerId = selectedSubject.career_id || selectedSubject.careerId || selectedSubject.career;
          const gCareerId = g.career_id || g.careerId || g.career;

          const matchesCareer = selectedSubject.isCommonCore || 
                               (gCareerId && sCareerId && (String(gCareerId) === String(sCareerId)));

          // Extremely permissive: same teacher + same semester + (name match OR no name in group)
          const isTeacherSemesterLink = matchesTeacher && matchesSemester;

          const isMatch = isDirectLink || isNameLink || isTeacherSemesterLink || (matchesSemester && matchesCareer);
          
          if (isMatch) {
            console.log('Found matching group:', g.name, 'via', { isDirectLink, isNameLink, isTeacherSemesterLink, matchesSemester, matchesCareer });
          }
          
          return isMatch;
        });

        // Get student IDs from evaluations as a fallback
        const evaluatedStudentIds = (evaluationsData || []).map(ev => ev.student_id);

        const subjectStudents = students.filter(s => {
          const studentGroupId = String(s.group_id || s.group || s.groupId || '').trim();
          const studentGroup = groups.find(g => String(g.id) === studentGroupId || String(g.name).trim() === studentGroupId);
          // Use student's semester, cuatrimestre, or the group's semester/name as sources
          const studentSemesters = getSemesters(s.semester || s.cuatrimestre || studentGroup?.semester || studentGroup?.name || 0);
          
          const normalizeString = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
          const getCareerId = (val: any) => {
            if (!val) return null;
            const valStr = String(val).trim();
            const normalizedVal = normalizeString(valStr);
            const career = (careers || []).find(c => 
              String(c.id) === valStr || 
              normalizeString(String(c.code)) === normalizedVal || 
              normalizeString(String(c.name)) === normalizedVal
            );
            return career ? String(career.id) : valStr;
          };

          const studentCareerIdResolved = getCareerId(s.career_id || s.career || studentGroup?.career_id || studentGroup?.career);
          const sCareerIdResolved = getCareerId(selectedSubject.career_id || selectedSubject.careerId || selectedSubject.career);
          const sSemesters = getSemesters(selectedSubject.semester || 0);

          const isInMatchedGroup = subjectGroups.some(g => String(g.id) === studentGroupId || String(g.name).trim() === studentGroupId);
          const hasEvaluation = evaluatedStudentIds.includes(s.id);
          
          const matchesSemesterAndCareer = studentSemesters.some(sem => sSemesters.includes(sem)) && 
            (selectedSubject.isCommonCore || !sCareerIdResolved || !studentCareerIdResolved || studentCareerIdResolved === sCareerIdResolved);
          
          const match = isInMatchedGroup || hasEvaluation || matchesSemesterAndCareer;
          
          if (match) {
            console.log('Found matching student:', s.name, 'via', { isInMatchedGroup, hasEvaluation, matchesSemesterAndCareer });
          }
          return match;
        });

        console.log('Total subject groups found:', subjectGroups.length);
        console.log('Total subject students found:', subjectStudents.length);

        setSelectedSubjectData({
          rubrics: allRubrics,
          evaluations: (evaluationsData || []).map(ev => ({
            id: ev.id,
            studentId: ev.student_id,
            studentName: students.find(s => s.id === ev.student_id)?.name || 'Desconocido',
            rubricId: ev.rubric_id,
            scores: ev.scores,
            totalScore: parseFloat(ev.total_score),
            status: ev.status
          })),
          subjectCriteria: criteriaData || [],
          students: subjectStudents
        });
      } catch (err) {
        console.error('Error fetching subject details:', err);
      } finally {
        setLoadingSubjectData(false);
      }
    };

    fetchSubjectDetails();
  }, [selectedSubject, groups, students]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setManagedGroup(null);
  };

  const logActivity = async (action: string, details: string, type: 'create' | 'update' | 'delete' | 'import') => {
    if (!isSupabaseConfigured) return;
    try {
      await supabase.from('activity_history').insert({
        action,
        details,
        type
      });
    } catch (err) {
      console.error('Error logging activity:', err);
    }
  };

  const fetchData = async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    try {
      const failedTables: string[] = [];
      const fetchTable = async (tableName: string, query: any) => {
        try {
          const { data, error } = await query;
          if (error) {
            console.error(`Error fetching table "${tableName}":`, {
              message: error.message,
              code: error.code,
              details: error.details,
              hint: error.hint
            });
            // Only show toast for errors other than "table not found"
            if (!error.message.includes('Could not find the table') && 
                !error.message.includes('does not exist')) {
              failedTables.push(tableName);
            }
            return [];
          }
          return data || [];
        } catch (err: any) {
          console.error(`Exception while fetching ${tableName}:`, err);
          if (err.code === '42P01') {
            console.error(`Table ${tableName} does not exist. Please run the SQL in schema.sql`);
            showToast(`La tabla '${tableName}' no existe en la base de datos.`, 'warning');
          } else if (err.code === 'PGRST116') {
            // Not an error, just no data returned
            return [];
          }
          failedTables.push(tableName);
          return [];
        }
      };

      const [
        studentsData,
        teachersData,
        careersData,
        subjectsData,
        groupsData,
        partialGradesData,
        evaluationsData,
        rubricsData,
        enrollmentsData,
        debtsData,
        historyData
      ] = await Promise.all([
        fetchTable('students', supabase.from('students').select('*')),
        fetchTable('teachers', supabase.from('teachers').select('*')),
        fetchTable('careers', supabase.from('careers').select('*')),
        fetchTable('subjects', supabase.from('subjects').select('*')),
        fetchTable('groups', supabase.from('groups').select('*')),
        fetchTable('partial_grades', supabase.from('partial_grades').select('*')),
        fetchTable('evaluations', supabase.from('evaluations').select('*')),
        fetchTable('rubrics', supabase.from('rubrics').select('*')),
        fetchTable('subject_enrollments', supabase.from('subject_enrollments').select('*')),
        fetchTable('student_debts', supabase.from('student_debts').select('*')),
        fetchTable('activity_history', supabase.from('activity_history').select('*').order('created_at', { ascending: false }).limit(20))
      ]);

      if (failedTables.length > 0) {
        showToast(`Error al cargar: ${failedTables.join(', ')}`, 'error');
      }

      console.log('Groups Data:', groupsData);

      if (groupsData && groupsData.length === 0) {
        console.warn('Groups table is empty. Check RLS policies in Supabase.');
      }

      if (studentsData) setStudents(studentsData.map((s: any) => ({ 
        ...s, 
        id: s.id,
        name: s.name || `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Sin Nombre',
        career: s.career_id,
        group: s.group_id
      })));
      if (teachersData) setTeachers(teachersData.map((t: any) => ({ 
        ...t, 
        id: t.id,
        employeeId: t.employee_id
      })));
      if (careersData) setCareers(careersData.map((c: any) => ({ 
        ...c, 
        id: c.id,
        headOfCareer: c.head_of_career
      })));
      if (subjectsData) {
        const processedSubjects = subjectsData.map((s: any) => {
          const teacher = teachersData?.find((t: any) => t.id === s.teacher_id || t.id === s.teacherId);
          const sTeacherName = teacher ? teacher.name : null;
          const sTeacherId = s.teacher_id || s.teacherId;
          const sId = String(s.id);
          const sName = (s.name || '').toLowerCase().trim();
          const sCode = (s.code || '').toLowerCase().trim();

          const sCareerId = s.career_id || s.careerId;
          const sCareerObj = careersData?.find((c: any) => c.id === sCareerId);
          const sCareerName = sCareerObj?.name || s.career;
          const sCareerClean = cleanText(sCareerName);
          const sIsCommon = s.is_common_core || s.isCommonCore || sCareerClean === 'todas' || sCareerClean === 'tronco comun' || sCareerClean === '';

          // Calculate real progress based on partial_grades
          const subjectGrades = partialGradesData?.filter(pg => {
            const pgSubjectId = String(pg.subject_id || pg.subjectId || '');
            const pgSubjectName = cleanText(pg.subject || pg.subject_name || pg.materia);
            const sNameClean = cleanText(s.name);
            const sCodeClean = cleanText(s.code);
            return pgSubjectId === sId || (pgSubjectName !== '' && (pgSubjectName === sNameClean || pgSubjectName === sCodeClean || sNameClean.includes(pgSubjectName) || pgSubjectName.includes(sNameClean)));
          }) || [];
          
          const subjectGroups = groupsData?.filter(g => {
            const gSubjectId = g.subject_id || g.subjectId;
            const isDirectLink = (gSubjectId && String(gSubjectId) === sId) || (s.group_id && String(s.group_id) === String(g.id));
            
            const gSubjectClean = cleanText(g.subject || g.materia);
            const sNameClean = cleanText(s.name);
            const sCodeClean = cleanText(s.code);

            const isNameLink = gSubjectClean !== '' && (
              gSubjectClean === sNameClean || 
              gSubjectClean === sCodeClean || 
              gSubjectClean.includes(sNameClean) || 
              sNameClean.includes(gSubjectClean)
            );
            
            const gTeacherId = g.teacher_id || g.teacherId;
            const sTeacherNameClean = cleanText(sTeacherName);
            const gTeacherClean = cleanText(g.teacher);

            const matchesTeacher = (gTeacherId && sTeacherId && String(gTeacherId) === String(sTeacherId)) ||
                                  (gTeacherClean !== '' && sTeacherNameClean !== '' && gTeacherClean === sTeacherNameClean);
            
            const gSemesters = getSemesters(g.semester || g.name);
            const sSemesters = getSemesters(s.semester);
            const matchesSemester = gSemesters.some(sem => sSemesters.includes(sem));
            
            const gCareerId = g.career_id || g.careerId || g.career;
            const gCareerObj = careersData?.find((c: any) => c.id === gCareerId);
            const gCareerName = gCareerObj?.name || (gCareerId === g.career_id ? g.career : gCareerId);
            const gCareerClean = cleanText(gCareerName);

            // Fuzzy Career Matching for groups
            const sWords = sCareerClean.split(' ').filter(w => w.length > 3);
            const hasCareerOverlap = sWords.length > 0 && sWords.some(word => gCareerClean.includes(word));

            const matchesCareer = sIsCommon || (gCareerClean !== '' && sCareerClean !== '' && (
              gCareerClean === sCareerClean || 
              hasCareerOverlap ||
              gCareerClean.includes(sCareerClean) || 
              sCareerClean.includes(gCareerClean)
            ));
            
            if (isDirectLink) return true;
            return matchesSemester && matchesCareer && (isNameLink || matchesTeacher);
          }) || [];

          // Fallback: if no groups found via direct link/name, look at partial_grades to find which groups are using this subject
          if (subjectGroups.length === 0 && subjectGrades.length > 0) {
            const groupIdsFromGrades = Array.from(new Set(subjectGrades.map(pg => String(pg.group_id || pg.groupId))));
            const groupsFromGrades = groupsData?.filter(g => 
              groupIdsFromGrades.includes(String(g.id)) || 
              groupIdsFromGrades.includes(String(g.name))
            ) || [];
            subjectGroups.push(...groupsFromGrades);
          }

          const studentIdsFromGrades = new Set(subjectGrades.map(pg => String(pg.student_id || pg.studentId)));
          const evaluatedStudentIds = new Set((evaluationsData || []).map(ev => String(ev.student_id)));

          // Use persisted enrollments if available
          const persistedEnrollments = enrollmentsData?.filter(e => String(e.subject_id) === sId) || [];

          const subjectStudents = studentsData?.filter(st => {
            const stIdStr = String(st.id);
            
            // If we have persisted enrollments for this subject, use them as the source of truth
            if (persistedEnrollments.length > 0) {
              return persistedEnrollments.some(e => String(e.student_id) === stIdStr);
            }

            if (studentIdsFromGrades.has(stIdStr)) return true;
            if (evaluatedStudentIds.has(stIdStr)) {
              const studentEvals = (evaluationsData || []).filter(ev => String(ev.student_id) === stIdStr);
              const subjectRubrics = rubricsData?.filter(r => String(r.subject_id || r.subjectId) === sId) || [];
              if (studentEvals.some(ev => subjectRubrics.some(r => String(r.id) === String(ev.rubric_id)))) {
                return true;
              }
            }

            const studentGroupId = String(st.group_id || st.group || st.groupId || '').trim();
            const studentGroup = groupsData?.find(g => String(g.id) === studentGroupId || String(g.name).trim() === studentGroupId);
            
            const stSemesters = getSemesters(st.semester || st.cuatrimestre || 0);
            const gSemesters = getSemesters(studentGroup?.semester || studentGroup?.name || 0);
            const sSemesters = getSemesters(s.semester || 0);

            const stCareerId = st.career_id || st.career;
            const stCareerObj = careersData?.find((c: any) => c.id === stCareerId);
            const stCareerName = stCareerObj?.name || (stCareerId === st.career_id ? st.career : stCareerId);
            const stCareerClean = cleanText(stCareerName);

            const grCareerId = studentGroup?.career_id || studentGroup?.career;
            const grCareerObj = careersData?.find((c: any) => c.id === grCareerId);
            const grCareerName = grCareerObj?.name || (grCareerId === studentGroup?.career_id ? studentGroup?.career : grCareerId);
            const grCareerClean = cleanText(grCareerName);

            // Fuzzy Career Matching: Check if any significant word from subject career exists in student/group career
            const sWords = sCareerClean.split(' ').filter(w => w.length > 3);
            const hasCareerOverlap = sWords.length > 0 && sWords.some(word => stCareerClean.includes(word) || grCareerClean.includes(word));

            const matchesCareer = sIsCommon || sCareerClean === '' || stCareerClean === '' || 
                                 stCareerClean === sCareerClean || grCareerClean === sCareerClean ||
                                 hasCareerOverlap ||
                                 stCareerClean.includes(sCareerClean) || sCareerClean.includes(stCareerClean) ||
                                 grCareerClean.includes(sCareerClean) || sCareerClean.includes(grCareerClean);

            // 1. Check if student is in one of the matching groups for this subject
            const isInMatchedGroup = studentGroupId !== '' && subjectGroups.some(g => 
              String(g.id) === studentGroupId || 
              String(g.name).trim() === studentGroupId ||
              (g.name && g.name.toLowerCase().trim() === studentGroupId.toLowerCase())
            );

            // 2. Check if student's semester matches subject's semester
            const matchesSemester = stSemesters.some(sem => sSemesters.includes(sem)) || gSemesters.some(sem => sSemesters.includes(sem));

            // Relation: Student is enrolled if (In a matched group) OR (Semester matches AND Career matches)
            return (isInMatchedGroup || (matchesSemester && matchesCareer));
          }) || [];
          
          const subjectRubrics = rubricsData?.filter(r => String(r.subject_id || r.subjectId) === sId) || [];
          const subjectEvaluations = evaluationsData?.filter(ev => 
            subjectRubrics.some(r => String(r.id) === String(ev.rubric_id)) &&
            subjectStudents.some(st => String(st.id) === String(ev.student_id))
          ) || [];

          let progress = 0;
          if (subjectStudents.length > 0) {
            // Calculate progress based on partial grades (3 partials per student)
            const totalPartialPossible = subjectStudents.length * 3;
            const capturedPartials = subjectGrades.reduce((acc, pg) => {
              let count = 0;
              // Only count grades for students currently in the subject
              if (!subjectStudents.some(st => String(st.id) === String(pg.student_id || pg.studentId))) return acc;
              
              // Count as captured if value is > 0 or if it's explicitly set (not null)
              if (pg.p1 !== null && pg.p1 !== undefined && (pg.p1 > 0 || pg.p1 === 0)) count++;
              if (pg.p2 !== null && pg.p2 !== undefined && (pg.p2 > 0 || pg.p2 === 0)) count++;
              if (pg.p3 !== null && pg.p3 !== undefined && (pg.p3 > 0 || pg.p3 === 0)) count++;
              return acc + count;
            }, 0);

            // Calculate progress based on evaluations (rubrics)
            const totalEvalPossible = subjectStudents.length * subjectRubrics.length;
            const capturedEvals = subjectEvaluations.length;

            const totalPossible = totalPartialPossible + totalEvalPossible;
            const totalCaptured = capturedPartials + capturedEvals;

            if (totalPossible > 0) {
              progress = Math.round((totalCaptured / totalPossible) * 100);
            }
          }

          // Prioritize: 1. Resolved career name from ID, 2. Text career column, 3. Fallback to Type
          let displayCareer = sCareerObj?.name || s.career;
          if (!displayCareer || displayCareer.trim() === '') {
            displayCareer = s.is_common_core ? 'Tronco Común' : 'Especialidad';
          }

          return { 
            ...s, 
            id: s.id,
            teacher: sTeacherName,
            teacher_id: sTeacherId,
            career: displayCareer,
            career_id: sCareerId,
            evaluationProgress: progress,
            studentsCount: subjectStudents.length,
            isCommonCore: s.is_common_core
          };
        });
        setSubjects(processedSubjects);
      }
      // Calculate student counts per group
      const studentCounts: Record<string, number> = {};
      if (studentsData) {
        studentsData.forEach((s: any) => {
          const gId = s.group_id || s.group || s.groupId;
          if (gId) {
            const gIdStr = String(gId);
            studentCounts[gIdStr] = (studentCounts[gIdStr] || 0) + 1;
          }
        });
      }

      if (groupsData) setGroups(groupsData.map((g: any) => {
        // Handle potential column name variations
        const teacherId = g.teacher_id || g.teacherId;
        const teacher = teachersData?.find((t: any) => t.id === teacherId);
        
        // Calculate capture progress for this group
        const groupStudents = studentsData?.filter(s => String(s.group_id || s.group || s.groupId) === String(g.id)) || [];
        const groupSubjectId = g.subject_id || g.subjectId;
        const groupGrades = partialGradesData?.filter(pg => 
          String(pg.group_id || pg.groupId) === String(g.id) && String(pg.subject_id || pg.subjectId) === String(groupSubjectId)
        ) || [];
        
        const groupRubrics = rubricsData?.filter(r => String(r.subject_id || r.subjectId) === String(groupSubjectId)) || [];
        const groupEvaluations = evaluationsData?.filter(ev => 
          groupRubrics.some(r => String(r.id) === String(ev.rubric_id)) &&
          groupStudents.some(s => String(s.id) === String(ev.student_id))
        ) || [];

        let captureProgress = 0;
        if (groupStudents.length > 0) {
          const totalPartialPossible = groupStudents.length * 3;
          const capturedPartials = groupGrades.reduce((acc, pg) => {
            let count = 0;
            if (pg.p1 !== null && pg.p1 !== undefined && (pg.p1 > 0 || pg.p1 === 0)) count++;
            if (pg.p2 !== null && pg.p2 !== undefined && (pg.p2 > 0 || pg.p2 === 0)) count++;
            if (pg.p3 !== null && pg.p3 !== undefined && (pg.p3 > 0 || pg.p3 === 0)) count++;
            return acc + count;
          }, 0);

          const totalEvalPossible = groupStudents.length * groupRubrics.length;
          const capturedEvals = groupEvaluations.length;

          const totalPossible = totalPartialPossible + totalEvalPossible;
          const totalCaptured = capturedPartials + capturedEvals;

          if (totalPossible > 0) {
            captureProgress = Math.round((totalCaptured / totalPossible) * 100);
          }
        }

        return { 
          ...g, 
          id: g.id,
          // Try multiple possible column names for the group name
          name: g.groups || g.name || g.group || g.nombre || 'Sin nombre',
          career: g.career_id || g.careerId,
          studentsCount: studentCounts[g.id] || 0,
          teacher_id: teacherId,
          teacher: teacher ? teacher.name : null,
          subject: g.subject || g.materia,
          captureProgress
        };
      }));

      if (partialGradesData) setPartialGrades(partialGradesData);

      if (debtsData) setDebts(debtsData.map((d: any) => {
        const student = studentsData?.find((s: any) => s.id === d.student_id);
        return {
          studentId: d.student_id,
          firstName: student?.first_name || student?.name?.split(' ')[0] || '',
          lastName: student?.last_name || student?.name?.split(' ').slice(1).join(' ') || '',
          enrollment: student?.enrollment || '',
          period: d.period,
          year: d.year,
          status: student?.status || 'active',
          campus: d.campus || 'Principal',
          type: 'Colegiatura',
          discount: Number(d.discount_percentage || 0),
          tuitionDebt: Number(d.tuition_debt || 0),
          powerCourseDebt: Number(d.power_course_debt || 0),
          adminDebt: Number(d.admin_debt || 0),
          reinstatementDebt: Number(d.reinstatement_debt || 0),
          otherDebt: Number(d.other_debt || 0),
          total: Number(d.tuition_debt || 0) + Number(d.power_course_debt || 0) + Number(d.admin_debt || 0) + Number(d.reinstatement_debt || 0) + Number(d.other_debt || 0),
          debtDate: d.debt_date
        };
      }));

      if (historyData) setHistory(historyData.map((h: any) => ({
        id: h.id,
        action: h.action,
        details: h.details,
        type: h.type,
        date: new Date(h.created_at).toLocaleString('es-MX'),
        user: 'Admin'
      })));

      if (partialGradesData && partialGradesData.length > 0) {
        const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const currentMonth = new Date().getMonth();
        const data = months.slice(0, currentMonth + 1).map((month) => {
          const avg = partialGradesData.reduce((acc: number, curr: any) => acc + Number(curr.average || 0), 0) / partialGradesData.length;
          const variation = (Math.random() - 0.5) * 10;
          return {
            name: month,
            rendimiento: Math.min(100, Math.max(0, Math.round((avg * 10) + variation)))
          };
        });
        setRendimientoData(data);
      } else {
        setRendimientoData([
          { name: 'Ene', rendimiento: 85 },
          { name: 'Feb', rendimiento: 88 },
          { name: 'Mar', rendimiento: 82 },
          { name: 'Abr', rendimiento: 90 }
        ]);
      }
    } catch (err) {
      console.error('Error fetching from Supabase:', err);
      // Clear data to avoid confusion on error
      if (isSupabaseConfigured) {
        setStudents([]);
        setTeachers([]);
        setCareers([]);
        setSubjects([]);
        setGroups([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    if (!isSupabaseConfigured || !isAuthenticated) return;

    // Set up real-time subscriptions for all relevant tables
    const channel = supabase.channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public' },
        (payload) => {
          console.log('Database change received!', payload);
          // Refresh data when any change occurs
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated]);

  useEffect(() => {
    initializeMsal();
    const checkSession = async () => {
      const savedSession = localStorage.getItem('user_session');
      if (savedSession) {
        try {
          const user = JSON.parse(savedSession);
          setRole(user.role as User['role']);
          setCurrentUser({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role as User['role'],
            avatar_url: user.avatar_url
          });
          setIsAuthenticated(true);
        } catch (e) {
          localStorage.removeItem('user_session');
        }
      }
      setLoading(false);
    };

    checkSession();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user_session');
    setIsAuthenticated(false);
    setActiveTab('dashboard');
    setManagedGroup(null);
    setCurrentUser(null);
  };

  const handleLogin = (userRole: User['role']) => {
    setRole(userRole);
    const savedSession = localStorage.getItem('user_session');
    let userData: any = {};
    if (savedSession) {
      try {
        userData = JSON.parse(savedSession);
      } catch (e) {
        console.error('Error parsing session', e);
      }
    }

    const newUser: User = {
      id: userData.id,
      name: userData.name,
      email: userData.email,
      role: userRole,
      avatar_url: userData.avatar_url
    };
    setCurrentUser(newUser);
    setIsAuthenticated(true);
  };

  const handleUpdateProfile = async (updated: Partial<User> & { avatarFile?: File }) => {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      let avatarUrl = updated.avatar_url || currentUser.avatar_url;

      if (updated.avatarFile && isSupabaseConfigured) {
        const file = updated.avatarFile;
        const fileExt = file.name.split('.').pop();
        const fileName = `profile_${currentUser.id}.${fileExt}`;
        const filePath = `${fileName}`;

        // Attempt to upload
        let { error: uploadError } = await supabase.storage
          .from('fotos_perfil')
          .upload(filePath, file, { upsert: true });

        // If bucket not found, try to create it
        if (uploadError && (uploadError.message.includes('Bucket not found') || uploadError.message.includes('The resource was not found'))) {
          const { error: createBucketError } = await supabase.storage.createBucket('fotos_perfil', {
            public: true,
            fileSizeLimit: 1024 * 1024 * 2, // 2MB
            allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
          });

          if (createBucketError) {
            console.error('Error creating bucket:', createBucketError);
            showToast('Error crítico: El bucket "fotos_perfil" no existe y no se pudo crear automáticamente. Debes crearlo manualmente en Supabase (Storage -> New Bucket -> "fotos_perfil" -> Public).', 'error');
            throw new Error('Bucket "fotos_perfil" not found and could not be created');
          }

          // Retry upload after creating bucket
          const { error: retryError } = await supabase.storage
            .from('fotos_perfil')
            .upload(filePath, file, { upsert: true });
          
          uploadError = retryError;
        }

        if (uploadError) {
          throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('fotos_perfil')
          .getPublicUrl(filePath);
        
        avatarUrl = publicUrl;
      }

      if (isSupabaseConfigured) {
        const { error } = await supabase
          .from('profiles')
          .update({
            name: updated.name || currentUser.name,
            avatar_url: avatarUrl
          })
          .eq('id', currentUser.id);

        if (error) {
          if (error.message.includes('column "avatar_url" does not exist')) {
            showToast('La columna "avatar_url" no existe en la tabla profiles.', 'error');
          } else {
            throw error;
          }
        }
      }

      const newUser = { ...currentUser, ...updated, avatar_url: avatarUrl };
      delete (newUser as any).avatarFile;
      setCurrentUser(newUser);
      showToast('Perfil actualizado con éxito');
    } catch (err: any) {
      console.error('Update Profile Error:', err);
      if (err.message && (err.message.includes('row-level security') || err.message.includes('policy'))) {
        showToast('Error de permisos: Tu sesión ha expirado o no tienes permisos. Por favor cierra sesión y vuelve a ingresar.', 'error');
      } else {
        showToast(`Error al actualizar perfil: ${err.message}`, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (current: string, newPass: string) => {
    if (!currentUser) return;
    setLoading(true);
    try {
      // 1. Verificar la contraseña actual en la tabla profiles
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('pasword')
        .eq('id', currentUser.id)
        .single();

      if (profileError || !profile) {
        throw new Error('Error al verificar el perfil del usuario.');
      }

      if (profile.pasword !== current) {
        throw new Error('La contraseña actual es incorrecta.');
      }

      // 2. Actualizar contraseña en la tabla profiles
      const { error: updateProfileError } = await supabase
        .from('profiles')
        .update({ pasword: newPass })
        .eq('id', currentUser.id);

      if (updateProfileError) {
        throw new Error(`Error al actualizar perfil: ${updateProfileError.message}`);
      }

      // 3. Intentar actualizar contraseña en Supabase Auth
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPass
      });

      if (updateError) {
        console.warn('No se pudo actualizar la contraseña en Supabase Auth (puede que no haya sesión):', updateError.message);
      }

      showToast('Contraseña actualizada correctamente');
    } catch (err: any) {
      console.error('Password Update Error:', err);
      showToast(err.message || 'Error al actualizar contraseña', 'error');
      throw err; // Re-throw to let child component know it failed
    } finally {
      setLoading(false);
    }
  };

  const openManagementModal = (type: 'student' | 'teacher' | 'career' | 'subject' | 'group', item?: any) => {
    setManagementModalType(type);
    setEditingItem(item || null);
    setIsManagementModalOpen(true);
  };

  const showToast = (message: string, type: ToastType = 'success') => {
    setNotification({ message, type, isOpen: true });
  };

  const handleCreateMSTeam = async (group: Group) => {
    if (!group) return;
    
    // 1. Get group matching subjects
    const groupSemesters = String(group.semester).match(/\d+/g)?.map(Number) || [];
    const groupSubjects = subjects.filter(s => {
      const sSemesters = String(s.semester).match(/\d+/g)?.map(Number) || [];
      return groupSemesters.some(sem => sSemesters.includes(sem));
    });

    const teamDescription = `Equipo colaborativo para el grupo ${group.name} del cuatrimestre ${group.semester}.`;
    
    // 2. Propietarios (Docentes seleccionados + Usuario Actual)
    const ownerEmails = teachers
      .filter(t => selectedTeamOwners.includes(t.id) || selectedTeamOwners.includes(t.name))
      .map(t => t.email)
      .filter(Boolean) as string[];
    
    if (currentUser?.email && !ownerEmails.includes(currentUser.email)) {
      ownerEmails.push(currentUser.email);
    }

    // 3. Miembros (Alumnos del grupo)
    const groupStudents = students.filter(s => 
      String(s.group_id) === String(group.id) || 
      String(s.group) === String(group.name)
    );
    const memberEmails = groupStudents.map(s => s.email).filter(Boolean) as string[];

    if (ownerEmails.length === 0) {
      showToast("Debe haber al menos un docente o administrador seleccionado como propietario.", "error");
      return;
    }

    setStepperData({
      groupId: group.id,
      displayName: group.name,
      description: teamDescription,
      ownerEmails,
      memberEmails
    });
    
    setShowTeamsStepper(true);
  };

  const handleDeleteTeam = async (group: Group) => {
    if (confirm(`¿Estás seguro de que deseas desenlazar/eliminar el equipo de MS Teams para el grupo ${group.name}?`)) {
      if (isSupabaseConfigured) {
        try {
          await supabase.from('groups').update({ team_created: false }).eq('id', group.id);
          setGroups(prev => prev.map(g => g.id === group.id ? { ...g, team_created: false } : g));
          showToast(`El equipo del grupo ${group.name} ha sido eliminado.`, 'success');
        } catch (error) {
          console.error("Error al eliminar el equipo:", error);
          showToast('Error al intentar eliminar el equipo.', 'error');
        }
      } else {
        setGroups(prev => prev.map(g => g.id === group.id ? { ...g, team_created: false } : g));
        showToast(`El equipo del grupo ${group.name} ha sido eliminado localmente.`, 'success');
      }
    }
  };

  const handleSaveManagement = async (data: any) => {
    const isUpdate = !!editingItem;
    const newId = isUpdate ? editingItem.id : Math.random().toString(36).substr(2, 9);
    
    setLoading(true);
    try {
      if (isSupabaseConfigured) {
        const tableMap = {
          student: 'students',
          teacher: 'teachers',
          career: 'careers',
          subject: 'subjects',
          group: 'groups'
        };
        const tableName = tableMap[managementModalType];
        
        // Map fields for Supabase
        const mapping: Record<string, string> = {
          enrollment: 'enrollment',
          name: 'name',
          career: 'career_id',
          semester: 'semester',
          group: 'group_id',
          status: 'status',
          modality: 'modality',
          employeeId: 'employee_id',
          specialty: 'specialty',
          email: 'email',
          pasword: 'pasword',
          code: 'code',
          headOfCareer: 'head_of_career',
          credits: 'credits',
          teacher: 'teacher_id',
          evaluationProgress: 'evaluation_progress',
          avatar_url: 'avatar_url',
          group_id: 'group_id'
        };

        const validFields: Record<string, string[]> = {
          student: ['name', 'enrollment', 'career_id', 'semester', 'group_id', 'status', 'modality'],
          teacher: ['name', 'employee_id', 'specialty', 'email', 'pasword'],
          career: ['name', 'code', 'head_of_career'],
          subject: ['name', 'code', 'semester', 'credits', 'teacher_id', 'evaluation_progress', 'career', 'career_id', 'is_common_core', 'group_id'],
          group: ['name', 'groups', 'semester', 'career_id', 'modality', 'students_count']
        };

        const dbRow: any = {};
        const allowedColumns = validFields[managementModalType];

        Object.entries(data).forEach(([key, val]) => {
          let dbKey = mapping[key] || key;
          
          // Special handling for Subject fields
          if (managementModalType === 'subject') {
            if (key === 'isCommonCore') dbKey = 'is_common_core';
          }

          if (allowedColumns.includes(dbKey)) {
            dbRow[dbKey] = val;
          }
          // If we have 'name' but DB needs 'groups', map it too
          if (managementModalType === 'group' && key === 'name') {
            dbRow['groups'] = val;
          }
          if (managementModalType === 'group' && key === 'studentsCount') {
            dbRow['students_count'] = Number(val);
          }
        });

        // Ensure numeric fields are numbers
        if (dbRow.semester) dbRow.semester = String(dbRow.semester);
        if (dbRow.credits) dbRow.credits = Number(dbRow.credits);

        // Apply defaults
        if (managementModalType === 'student' && !dbRow.status) {
          dbRow.status = 'active';
        }
        if (managementModalType === 'subject' && dbRow.evaluation_progress === undefined) {
          dbRow.evaluation_progress = 0;
        }
        if (managementModalType === 'group' && dbRow.students_count === undefined) {
          dbRow.students_count = 0;
        }

        let finalId = newId;
        if (isUpdate) {
          const { error } = await supabase.from(tableName).update(dbRow).eq('id', newId);
          if (error) throw error;
        } else {
          const { data: insertedData, error } = await supabase.from(tableName).insert([dbRow]).select();
          if (error) throw error;
          if (insertedData && insertedData[0]) {
            finalId = insertedData[0].id;
          }
        }

        // Create user profile for teachers
        if (managementModalType === 'teacher') {
          const emailPrefix = data.email.split('@')[0];
          const generatedPassword = `${emailPrefix}123`;
          
          const profileData = {
            name: data.name,
            username: data.name,
            email: data.email,
            pasword: generatedPassword,
            role: 'DOCENTE',
            avatar_url: data.avatar_url || null
          };

          // Check if profile exists
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', data.email)
            .single();

          let profileError;
          
          if (existingProfile) {
            // Update existing
            const { error } = await supabase
              .from('profiles')
              .update(profileData)
              .eq('id', existingProfile.id);
            profileError = error;
          } else {
            // Insert new
            const { error } = await supabase
              .from('profiles')
              .insert([profileData]);
            profileError = error;
          }

          if (profileError) {
            console.error('Error creating/updating profile:', profileError);
            showToast(`Profesor guardado, pero hubo un error al generar su usuario: ${profileError.message}`, 'warning');
          } else {
            console.log('Profile created/updated successfully');
          }
        }

        const processSave = (prev: any[]) => {
          if (isUpdate) {
            return prev.map(item => item.id === finalId ? { ...item, ...data } : item);
          }
          return [...prev, { ...data, id: finalId }];
        };

        switch (managementModalType) {
          case 'student':
            setStudents(prev => {
              if (isUpdate) return prev.map(s => s.id === finalId ? { ...s, ...data } : s);
              return [...prev, { ...data, id: finalId, status: 'active' }];
            });
            break;
          case 'teacher':
            setTeachers(prev => processSave(prev));
            break;
          case 'career':
            setCareers(prev => processSave(prev));
            break;
          case 'subject':
            setSubjects(prev => {
              if (isUpdate) return prev.map(s => s.id === finalId ? { ...s, ...data } : s);
              return [...prev, { ...data, id: finalId, evaluationProgress: 0 }];
            });
            break;
          case 'group':
            setGroups(prev => {
              if (isUpdate) return prev.map(g => g.id === finalId ? { ...g, ...data } : g);
              return [...prev, { ...data, id: finalId, studentsCount: 0 }];
            });
            break;
        }
      } else {
        // Mock mode
        const processSave = (prev: any[]) => {
          if (isUpdate) {
            return prev.map(item => item.id === newId ? { ...item, ...data } : item);
          }
          return [...prev, { ...data, id: newId }];
        };

        switch (managementModalType) {
          case 'student':
            setStudents(prev => {
              if (isUpdate) return prev.map(s => s.id === newId ? { ...s, ...data } : s);
              return [...prev, { ...data, id: newId, status: 'active' }];
            });
            break;
          case 'teacher':
            setTeachers(prev => processSave(prev));
            break;
          case 'career':
            setCareers(prev => processSave(prev));
            break;
          case 'subject':
            setSubjects(prev => {
              if (isUpdate) return prev.map(s => s.id === newId ? { ...s, ...data } : s);
              return [...prev, { ...data, id: newId, evaluationProgress: 0 }];
            });
            break;
          case 'group':
            setGroups(prev => {
              if (isUpdate) return prev.map(g => g.id === newId ? { ...g, ...data } : g);
              return [...prev, { ...data, id: newId, studentsCount: 0 }];
            });
            break;
        }
      }

      showToast(isUpdate ? 'Registro actualizado con éxito' : 'Registro creado con éxito');
      
      if (isSupabaseConfigured) {
        await fetchData();
      }
    } catch (err: any) {
      console.error('Supabase Save Error:', err);
      
      let errorMessage = err.message;
      if (err.code === '23505') {
        if (err.message.includes('employee_id')) {
          errorMessage = 'El ID de empleado ya existe. Por favor, ingresa uno diferente.';
        } else if (err.message.includes('email')) {
          errorMessage = 'El correo electrónico ya está registrado. Por favor, ingresa uno diferente.';
        } else if (err.message.includes('enrollment')) {
          errorMessage = 'La matrícula ya existe. Por favor, ingresa una diferente.';
        } else if (err.message.includes('code')) {
          errorMessage = 'El código ya existe. Por favor, ingresa uno diferente.';
        } else {
          errorMessage = 'Ya existe un registro con estos datos únicos.';
        }
      }
      
      showToast(`Error al guardar: ${errorMessage}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    id: string;
    type: 'student' | 'teacher' | 'career' | 'subject' | 'group';
  }>({
    isOpen: false,
    id: '',
    type: 'student'
  });

  const handleDelete = (id: string, type: 'student' | 'teacher' | 'career' | 'subject' | 'group') => {
    setDeleteConfirmation({ isOpen: true, id, type });
  };

  const confirmDelete = async () => {
    const { id, type } = deleteConfirmation;
    if (!id) return;
    
    setLoading(true);
    try {
      if (isSupabaseConfigured) {
        const tableMap = {
          student: 'students',
          teacher: 'teachers',
          career: 'careers',
          subject: 'subjects',
          group: 'groups'
        };
        const tableName = tableMap[type];
        
        // If deleting a teacher, first get their email to delete their profile
        let teacherEmail = '';
        if (type === 'teacher') {
          const { data: teacherData } = await supabase
            .from('teachers')
            .select('email')
            .eq('id', id)
            .single();
          if (teacherData) {
            teacherEmail = teacherData.email;
          }
        }

        const { error } = await supabase.from(tableName).delete().eq('id', id);
        
        if (error) {
          console.error(`Error deleting from ${tableName}:`, error);
          throw new Error(error.message || 'Error al eliminar de la base de datos');
        }

        // If teacher was deleted successfully, delete their profile
        if (type === 'teacher' && teacherEmail) {
          const { error: profileError } = await supabase
            .from('profiles')
            .delete()
            .eq('email', teacherEmail);
            
          if (profileError) {
            console.error('Error deleting teacher profile:', profileError);
            // We don't throw here to avoid confusing the user since the main record was deleted
            showToast('Profesor eliminado, pero hubo un error al eliminar su usuario de acceso.', 'warning');
          } else {
            console.log('Teacher profile deleted successfully');
          }
        }
      }

      // Update local state after successful delete
      const filterFn = (prev: any[]) => prev.filter(item => item.id !== id);

      switch (type) {
        case 'student':
          setStudents(filterFn);
          break;
        case 'teacher':
          setTeachers(filterFn);
          break;
        case 'career':
          setCareers(filterFn);
          break;
        case 'subject':
          setSubjects(filterFn);
          break;
        case 'group':
          setGroups(filterFn);
          break;
      }
      
      showToast('Registro eliminado correctamente');
      
      if (isSupabaseConfigured) {
        await fetchData();
      }
    } catch (err: any) {
      console.error('Error deleting:', err);
      showToast(`Error al eliminar: ${err.message}`, 'error');
    } finally {
      setLoading(false);
      setDeleteConfirmation(prev => ({ ...prev, isOpen: false }));
    }
  };

  const syncAllAcademicLoad = async (silent = false) => {
    if (!isSupabaseConfigured) return;
    if (!silent) setLoading(true);
    
    try {
      const enrollmentsToInsert: { student_id: string; subject_id: string }[] = [];
      const subjectUpdates: { id: string; group_id: string }[] = [];

      const getSemesters = (val: any) => String(val || '').match(/\d+/g)?.map(Number) || [];
      const cleanText = (str: any) => {
        if (!str) return '';
        return String(str).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
      };

      subjects.forEach(subject => {
        const sId = String(subject.id);
        const sSemesters = getSemesters(subject.semester);
        
        const sCareerId = subject.career_id || subject.careerId;
        const sCareerObj = careers.find(c => c.id === sCareerId || cleanText(c.code) === cleanText(sCareerId) || cleanText(c.name) === cleanText(sCareerId));
        const sCareerName = sCareerObj?.name || subject.career;
        const sCareerClean = cleanText(sCareerName);
        const isCommon = subject.isCommonCore || subject.is_common_core || 
                         sCareerClean === 'todas' || sCareerClean === 'tronco comun' || sCareerClean === '';

        // Auto-assign group to subject if not already assigned
        if (!subject.group_id) {
          const matchingGroup = groups.find(g => {
            const gSemesters = getSemesters(g.semester || g.name);
            const matchesSemester = gSemesters.some(sem => sSemesters.includes(sem));
            
            const gCareerId = g.career_id || g.careerId || g.career;
            const gCareerObj = careers.find(c => c.id === gCareerId || cleanText(c.code) === cleanText(gCareerId) || cleanText(c.name) === cleanText(gCareerId));
            const gCareerName = gCareerObj?.name || (gCareerId === g.career_id ? g.career : gCareerId);
            const gCareerClean = cleanText(gCareerName);

            const sWords = sCareerClean.split(' ').filter(w => w.length > 3);
            const hasCareerOverlap = sWords.length > 0 && sWords.some(word => gCareerClean.includes(word));

            const matchesCareer = isCommon || (gCareerClean !== '' && sCareerClean !== '' && (
              gCareerClean === sCareerClean || 
              hasCareerOverlap ||
              gCareerClean.includes(sCareerClean) || 
              sCareerClean.includes(gCareerClean)
            ));

            return matchesSemester && matchesCareer;
          });

          if (matchingGroup) {
            subjectUpdates.push({ id: subject.id, group_id: matchingGroup.id });
          }
        }

        students.forEach(student => {
          const studentGroupId = String(student.group_id || student.group || '').trim();
          const studentGroup = studentGroupId ? groups.find(g => 
            String(g.id) === studentGroupId || 
            cleanText(g.name) === cleanText(studentGroupId)
          ) : null;
          
          const stSemesters = getSemesters(student.semester);
          const grSemesters = getSemesters(studentGroup?.semester || studentGroup?.name);
          const combinedSemesters = [...new Set([...stSemesters, ...grSemesters])];
          
          const stCareerId = student.career_id || student.career;
          const stCareerObj = careers.find(c => c.id === stCareerId || cleanText(c.code) === cleanText(stCareerId) || cleanText(c.name) === cleanText(stCareerId));
          const stCareerName = stCareerObj?.name || (stCareerId === student.career_id ? student.career : stCareerId);
          const stCareerClean = cleanText(stCareerName);

          const grCareerId = studentGroup?.career_id || studentGroup?.career;
          const grCareerObj = careers.find(c => c.id === grCareerId || cleanText(c.code) === cleanText(grCareerId) || cleanText(c.name) === cleanText(grCareerId));
          const grCareerName = grCareerObj?.name || (grCareerId === studentGroup?.career_id ? studentGroup?.career : grCareerId);
          const grCareerClean = cleanText(grCareerName);
          
          const matchesSemester = combinedSemesters.some(sem => sSemesters.includes(sem));
          
          const sWords = sCareerClean.split(' ').filter(w => w.length > 3);
          const hasCareerOverlap = sWords.length > 0 && sWords.some(word => stCareerClean.includes(word) || grCareerClean.includes(word));
          
          const matchesCareer = isCommon || hasCareerOverlap || (sCareerClean === stCareerClean) || (sCareerClean === grCareerClean) || 
                               stCareerClean.includes(sCareerClean) || sCareerClean.includes(stCareerClean) ||
                               grCareerClean.includes(sCareerClean) || sCareerClean.includes(grCareerClean);

          if (matchesSemester && matchesCareer) {
            enrollmentsToInsert.push({
              student_id: student.id,
              subject_id: sId
            });
          }
        });
      });

      if (enrollmentsToInsert.length > 0) {
        await supabase.from('subject_enrollments').upsert(enrollmentsToInsert, { onConflict: 'student_id,subject_id' });
      }

      if (subjectUpdates.length > 0) {
        await Promise.all(subjectUpdates.map(update => 
          supabase.from('subjects').update({ group_id: update.group_id }).eq('id', update.id)
        ));
      }

      if (!silent) {
        showToast(`Sincronización automática completada: ${enrollmentsToInsert.length} inscripciones y ${subjectUpdates.length} materias vinculadas.`, 'success');
        fetchData();
      }
    } catch (error) {
      console.error('Error in global sync:', error);
      if (!silent) showToast('Error en la sincronización automática', 'error');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleSyncEnrollments = async () => {
    if (!isSupabaseConfigured) {
      showToast('Supabase no está configurado', 'error');
      return;
    }

    if (subjects.length === 0 || students.length === 0) {
      showToast('No hay datos de alumnos o materias cargados para sincronizar.', 'error');
      return;
    }

    setLoading(true);
    try {
      console.log('Starting sync. Subjects:', subjects.length, 'Students:', students.length);
      const enrollmentsToInsert: { student_id: string; subject_id: string }[] = [];
      const subjectUpdates: { id: string; group_id: string }[] = [];
      
      // Advanced normalization: removes accents, special chars, and common stop words
      const cleanText = (str: any) => {
        if (!str) return '';
        return String(str)
          .replace(/Ã¡/g, 'a').replace(/Ã©/g, 'e').replace(/Ã­/g, 'i').replace(/Ã³/g, 'o').replace(/Ãº/g, 'u').replace(/Ã±/g, 'n')
          .replace(/Ã/g, 'a')
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "") // Remove accents
          .toLowerCase()
          .replace(/[^a-z0-9 ]/g, ' ') // Remove special chars
          .replace(/\b(de|en|la|los|el|para|y|con|del)\b/g, ' ') // Remove stop words
          .replace(/\s+/g, ' ') // Collapse spaces
          .trim();
      };

      const getSemesters = (val: any) => String(val || '').match(/\d+/g)?.map(Number) || [];

      subjects.forEach(subject => {
        const sId = String(subject.id);
        const sSemesters = getSemesters(subject.semester);
        const sCareerId = subject.career_id || subject.careerId;
        const sCareerObj = careers.find(c => c.id === sCareerId);
        const sCareerName = sCareerObj?.name || subject.career;
        const sCareerClean = cleanText(sCareerName);
        const isCommon = subject.isCommonCore || subject.is_common_core || 
                         sCareerClean === 'todas' || sCareerClean === 'tronco comun' || sCareerClean === '';

        // Auto-assign group to subject if not already assigned
        if (!subject.group_id) {
          const matchingGroup = groups.find(g => {
            const gSemesters = getSemesters(g.semester || g.name);
            const matchesSemester = gSemesters.some(sem => sSemesters.includes(sem));
            
            const gCareerId = g.career_id || g.careerId || g.career;
            const gCareerObj = careers.find(c => c.id === gCareerId);
            const gCareerName = gCareerObj?.name || (gCareerId === g.career_id ? g.career : gCareerId);
            const gCareerClean = cleanText(gCareerName);

            const sWords = sCareerClean.split(' ').filter(w => w.length > 3);
            const hasCareerOverlap = sWords.length > 0 && sWords.some(word => gCareerClean.includes(word));

            const matchesCareer = isCommon || (gCareerClean !== '' && sCareerClean !== '' && (
              gCareerClean === sCareerClean || 
              hasCareerOverlap ||
              gCareerClean.includes(sCareerClean) || 
              sCareerClean.includes(gCareerClean)
            ));

            return matchesSemester && matchesCareer;
          });

          if (matchingGroup) {
            subjectUpdates.push({ id: subject.id, group_id: matchingGroup.id });
          }
        }

        students.forEach(student => {
          const studentGroupId = String(student.group_id || student.group || '').trim();
          const studentGroup = groups.find(g => 
            String(g.id) === studentGroupId || 
            String(g.name).trim() === studentGroupId
          );
          
          const stSemesters = getSemesters(student.semester);
          const grSemesters = getSemesters(studentGroup?.semester || studentGroup?.name);
          const combinedSemesters = [...new Set([...stSemesters, ...grSemesters])];
          
          const stCareerId = student.career_id || student.career;
          const stCareerObj = careers.find(c => c.id === stCareerId);
          const stCareerName = stCareerObj?.name || (stCareerId === student.career_id ? student.career : stCareerId);
          const stCareerClean = cleanText(stCareerName);

          const grCareerId = studentGroup?.career_id || studentGroup?.career;
          const grCareerObj = careers.find(c => c.id === grCareerId);
          const grCareerName = grCareerObj?.name || (grCareerId === studentGroup?.career_id ? studentGroup?.career : grCareerId);
          const grCareerClean = cleanText(grCareerName);
          
          const matchesSemester = combinedSemesters.some(sem => sSemesters.includes(sem));
          
          // Fuzzy Career Matching: Check if any significant word from subject career exists in student/group career
          const sWords = sCareerClean.split(' ').filter(w => w.length > 3);
          const hasCareerOverlap = sWords.length > 0 && sWords.some(word => stCareerClean.includes(word) || grCareerClean.includes(word));
          
          const matchesCareer = isCommon || hasCareerOverlap || (sCareerClean === stCareerClean) || (sCareerClean === grCareerClean) || 
                               stCareerClean.includes(sCareerClean) || sCareerClean.includes(stCareerClean) ||
                               grCareerClean.includes(sCareerClean) || sCareerClean.includes(grCareerClean);

          if (matchesSemester && matchesCareer) {
            enrollmentsToInsert.push({
              student_id: student.id,
              subject_id: sId
            });
          }
        });
      });

      if (enrollmentsToInsert.length === 0 && subjectUpdates.length === 0) {
        showToast('No se encontraron coincidencias. Revise que los cuatrimestres coincidan.', 'warning');
        return;
      }

      // Perform enrollments
      if (enrollmentsToInsert.length > 0) {
        const { error: enrollError } = await supabase
          .from('subject_enrollments')
          .upsert(enrollmentsToInsert, { onConflict: 'student_id,subject_id' });
        if (enrollError) throw enrollError;
      }

      // Perform subject group assignments
      if (subjectUpdates.length > 0) {
        // We can use upsert for subjects too if we only provide id and group_id, 
        // but we must be careful not to overwrite other fields if the table doesn't support partial upsert.
        // Actually, in Supabase/Postgres, upsert with partial data will overwrite with NULLs if not careful.
        // Better to do individual updates or a single query if possible.
        // Since subjectUpdates might be many, let's use a Promise.all for updates.
        await Promise.all(subjectUpdates.map(update => 
          supabase.from('subjects').update({ group_id: update.group_id }).eq('id', update.id)
        ));
      }

      showToast(`Sincronización exitosa: ${enrollmentsToInsert.length} alumnos inscritos y ${subjectUpdates.length} materias vinculadas a grupos.`, 'success');
      fetchData(); 
    } catch (error) {
      console.error('Error syncing enrollments:', error);
      showToast('Error al sincronizar inscripciones', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: any, type: 'student' | 'teacher' | 'career' | 'subject' | 'group') => {
    openManagementModal(type, item);
  };

  const handleImport = async (data: any[], type: 'student' | 'teacher' | 'career' | 'subject' | 'group' | 'debt' | 'grade') => {
    console.log(`handleImport called for type: ${type}`, { dataLength: data?.length, isArray: Array.isArray(data) });
    if (!Array.isArray(data)) {
      console.error('Data passed to handleImport is not an array', data);
      return;
    }
    setLoading(true);
    try {
      if (!isSupabaseConfigured) {
        console.error('Supabase no está configurado');
        showToast('Supabase no está configurado', 'error');
        return;
      }
      
      let currentGroups = [...groups];
      let currentCareers = [...careers];
      let currentStudents = [...students];
      let currentSubjects = [...subjects];

      let addedCount = 0;
      let skippedCount = 0;
      const tableMap = {
        student: 'students',
        teacher: 'teachers',
        career: 'careers',
        subject: 'subjects',
        group: 'groups',
        debt: 'student_debts',
        grade: 'partial_grades'
      };

      const keyMap = {
        student: 'enrollment',
        teacher: 'employee_id',
        career: 'code',
        subject: 'code',
        group: 'name',
        debt: 'id',
        grade: 'id'
      };

      const fieldMapping: Record<string, Record<string, string>> = {
        student: { enrollment: 'enrollment', name: 'name', first_name: 'first_name', last_name: 'last_name', career: 'career_id', semester: 'semester', group: 'group_id', status: 'status', modality: 'modality' },
        teacher: { employeeId: 'employee_id', name: 'name', specialty: 'specialty', email: 'email' },
        career: { code: 'code', name: 'name', headOfCareer: 'head_of_career' },
        subject: { 
          code: 'code', 
          codigo: 'code',
          name: 'name', 
          nombre: 'name',
          'nombre completo de la materia': 'name',
          semester: 'semester', 
          cuatrimestre: 'semester',
          credits: 'credits', 
          creditos: 'credits',
          teacher: 'teacher_id', 
          career: 'career', 
          carrera: 'career',
          career_id: 'career_id', 
          isCommonCore: 'is_common_core',
          tipo: 'is_common_core'
        },
        group: { name: 'name', groups: 'groups', semester: 'semester', career: 'career_id', modality: 'modality', studentsCount: 'students_count', teacher: 'teacher_id' },
        debt: {
          enrollment: 'student_id',
          period: 'period',
          year: 'year',
          campus: 'campus',
          discount: 'discount_percentage',
          tuition: 'tuition_debt',
          powerCourse: 'power_course_debt',
          admin: 'admin_debt',
          reinstatement: 'reinstatement_debt',
          other: 'other_debt',
          date: 'debt_date'
        },
        grade: {
          enrollment: 'student_id',
          subject: 'subject_id',
          partial: 'partial_number',
          grade: 'grade'
        }
      };

      const tableName = tableMap[type];
      const onConflictKey = keyMap[type];
      const mapping = fieldMapping[type];
      console.log(`Resolved: table=${tableName}, key=${onConflictKey}`, { mapping });
      console.log(`Mapeando datos para: ${type} en tabla: ${tableName}`);

      const normalizeString = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

      // Pre-process careers
      if (['student', 'group', 'subject', 'debt'].includes(type)) {
        console.log('Pre-procesando carreras...');
        const newCareersToCreate = new Map<string, any>();
        data.forEach(item => {
          let careerName = '';
          Object.entries(item).forEach(([key, val]) => {
            const k = key.toLowerCase().trim();
            if (k === 'carrera' || k === 'career') careerName = String(val).trim();
          });

          if (careerName) {
            const normalizedCareerName = normalizeString(careerName);
            const existingCareer = currentCareers.find(c => 
              normalizeString(c.name) === normalizedCareerName || 
              normalizeString(c.code) === normalizedCareerName
            );
            
            if (!existingCareer && !newCareersToCreate.has(normalizedCareerName)) {
              const code = careerName.replace(/[^a-zA-Z]/g, '').substring(0, 4).toUpperCase() || 'CAR';
              newCareersToCreate.set(normalizedCareerName, { name: careerName, code });
            }
          }
        });

        if (newCareersToCreate.size > 0) {
          console.log(`Insertando ${newCareersToCreate.size} nuevas carreras`);
          const careersToInsert = Array.from(newCareersToCreate.values());
          if (isSupabaseConfigured) {
            const { data: inserted, error } = await supabase.from('careers').upsert(careersToInsert, { onConflict: 'code' }).select();
            if (!error && inserted) {
              currentCareers = [...currentCareers, ...inserted];
              setCareers(currentCareers);
            } else if (error) {
              console.error('Error al insertar carreras:', error);
            }
          }
        }
      }

      // Pre-process groups
      if (['student', 'debt'].includes(type)) {
        console.log('Pre-procesando grupos...');
        const newGroupsToCreate = new Map<string, any>();
        data.forEach(item => {
          let groupName = '', semester = '1', careerId = null, modality = 'Escolarizada';
          Object.entries(item).forEach(([key, val]) => {
            const k = key.toLowerCase().trim();
            if (k === 'grupo' || k === 'group') groupName = String(val).trim();
            if (k === 'cuatrimestre' || k === 'semester') semester = String(val).trim();
            if (k === 'modalidad' || k === 'modality') {
              const mod = String(val).toLowerCase().trim();
              if (mod === 'presencial' || mod === 'escolarizada') modality = 'Escolarizada';
              else if (mod === 'online' || mod === 'ejecutiva') modality = 'Ejecutiva';
              else if (mod === 'híbrida' || mod === 'hibrida' || mod === 'sabatina') modality = 'Sabatina';
            }
            if (k === 'carrera' || k === 'career') {
              const normalizedCareerVal = normalizeString(String(val));
              const career = currentCareers.find(c => normalizeString(c.name) === normalizedCareerVal || normalizeString(c.code) === normalizedCareerVal);
              if (career) careerId = career.id;
            }
          });

          if (groupName) {
            const existingGroup = currentGroups.find(g => g.name.toLowerCase().trim() === groupName.toLowerCase());
            if (!existingGroup && !newGroupsToCreate.has(groupName.toLowerCase())) {
              newGroupsToCreate.set(groupName.toLowerCase(), { name: groupName, groups: groupName, semester, career_id: careerId, modality, students_count: 0 });
            }
          }
        });

        if (newGroupsToCreate.size > 0) {
          console.log(`Insertando ${newGroupsToCreate.size} nuevos grupos`);
          const groupsToInsert = Array.from(newGroupsToCreate.values());
          if (isSupabaseConfigured) {
            const { data: inserted, error } = await supabase.from('groups').upsert(groupsToInsert, { onConflict: 'name' }).select();
            if (!error && inserted) {
              currentGroups = [...currentGroups, ...inserted];
              setGroups(currentGroups);
            } else if (error) {
              console.error('Error al insertar grupos:', error);
            }
          }
        }
      }

      // Pre-process students for debt and grade imports
      if (['debt', 'grade'].includes(type)) {
        console.log('Pre-procesando estudiantes...');
        const newStudentsToCreate = new Map<string, any>();
        data.forEach(item => {
          let enrollment = '', name = '', firstName = '', lastName = '', careerId = null, groupId = null, semester = '1', modality = 'Escolarizada';
          Object.entries(item).forEach(([key, val]) => {
            const k = key.toLowerCase().trim();
            if (k === 'matricula' || k === 'matrícula') enrollment = String(val).trim();
            if (k === 'nombre' || k === 'nombre completo') name = String(val).trim();
            if (k === 'nombre(s)' || k === 'first_name') firstName = String(val).trim();
            if (k === 'apellido' || k === 'apellidos' || k === 'last_name') lastName = String(val).trim();
            if (k === 'cuatrimestre' || k === 'semester') semester = String(val).trim();
            if (k === 'carrera' || k === 'career') {
              const normalizedCareerVal = normalizeString(String(val));
              const career = currentCareers.find(c => normalizeString(c.name) === normalizedCareerVal || normalizeString(c.code) === normalizedCareerVal);
              if (career) careerId = career.id;
            }
            if (k === 'grupo' || k === 'group') {
              const group = currentGroups.find(g => g.name.toLowerCase().trim() === String(val).toLowerCase().trim());
              if (group) groupId = group.id;
            }
          });

          if (enrollment) {
            const existingStudent = currentStudents.find(s => s.enrollment.toLowerCase().trim() === enrollment.toLowerCase().trim());
            if (!existingStudent && !newStudentsToCreate.has(enrollment.toLowerCase())) {
              newStudentsToCreate.set(enrollment.toLowerCase(), {
                enrollment,
                name: name || `${firstName} ${lastName}`.trim() || 'Importado',
                first_name: firstName || name?.split(' ')[0] || 'Importado',
                last_name: lastName || name?.split(' ').slice(1).join(' ') || '',
                career_id: careerId,
                group_id: groupId,
                semester,
                modality,
                status: 'active'
              });
            }
          }
        });

        if (newStudentsToCreate.size > 0) {
          console.log(`Insertando ${newStudentsToCreate.size} nuevos estudiantes`);
          const studentsToInsert = Array.from(newStudentsToCreate.values());
          if (isSupabaseConfigured) {
            const { data: inserted, error } = await supabase.from('students').upsert(studentsToInsert, { onConflict: 'enrollment' }).select();
            if (!error && inserted) {
              currentStudents = [...currentStudents, ...inserted];
              setStudents(currentStudents);
            } else if (error) {
              console.error('Error al insertar estudiantes:', error);
            }
          }
        }
      }

      // Pre-process subjects for grade imports
      if (type === 'grade') {
        console.log('Pre-procesando materias...');
        const newSubjectsToCreate = new Map<string, any>();
        data.forEach(item => {
          let subjectName = '', subjectCode = '', semester = '1', careerId = null;
          Object.entries(item).forEach(([key, val]) => {
            const k = key.toLowerCase().trim();
            if (k === 'materia' || k === 'subject') subjectName = String(val).trim();
            if (k === 'codigo_materia' || k === 'subject_code') subjectCode = String(val).trim();
            if (k === 'cuatrimestre' || k === 'semester') semester = String(val).trim();
            if (k === 'carrera' || k === 'career') {
              const normalizedCareerVal = normalizeString(String(val));
              const career = currentCareers.find(c => normalizeString(c.name) === normalizedCareerVal || normalizeString(c.code) === normalizedCareerVal);
              if (career) careerId = career.id;
            }
          });

          if (subjectName) {
            const normalizedSubjectName = normalizeString(subjectName);
            const existingSubject = currentSubjects.find(s => normalizeString(s.name) === normalizedSubjectName || normalizeString(s.code) === normalizeString(subjectCode));
            if (!existingSubject && !newSubjectsToCreate.has(normalizedSubjectName)) {
              const code = subjectCode || subjectName.replace(/[^a-zA-Z]/g, '').substring(0, 6).toUpperCase() || 'SUB';
              newSubjectsToCreate.set(normalizedSubjectName, { name: subjectName, code, semester, career_id: careerId, credits: 8 });
            }
          }
        });

        if (newSubjectsToCreate.size > 0) {
          console.log(`Insertando ${newSubjectsToCreate.size} nuevas materias`);
          const subjectsToInsert = Array.from(newSubjectsToCreate.values());
          if (isSupabaseConfigured) {
            const { data: inserted, error } = await supabase.from('subjects').upsert(subjectsToInsert, { onConflict: 'code' }).select();
            if (!error && inserted) {
              currentSubjects = [...currentSubjects, ...inserted];
              setSubjects(currentSubjects);
            } else if (error) {
              console.error('Error al insertar materias:', error);
            }
          }
        }
      }

      // Pre-process students (for debt or grade imports)
      if (['debt', 'grade'].includes(type)) {
        const newStudentsToCreate = new Map<string, any>();
        data.forEach(item => {
          let enrollment = '', firstName = '', lastName = '', groupName = '', careerName = '';
          Object.entries(item).forEach(([key, val]) => {
            const k = key.toLowerCase().trim();
            if (k === 'matricula' || k === 'matrícula' || k === 'enrollment') enrollment = String(val).trim();
            if (k === 'nombre' || k === 'first_name' || k === 'first name') firstName = String(val).trim();
            if (k === 'apellido' || k === 'last_name' || k === 'last name') lastName = String(val).trim();
            if (k === 'grupo' || k === 'group') groupName = String(val).trim();
            if (k === 'carrera' || k === 'career') careerName = String(val).trim();
          });

          if (enrollment) {
            const existingStudent = currentStudents.find(s => s.enrollment.toLowerCase().trim() === enrollment.toLowerCase().trim());
            if (!existingStudent && !newStudentsToCreate.has(enrollment.toLowerCase())) {
              const group = currentGroups.find(g => g.name.toLowerCase().trim() === groupName.toLowerCase().trim());
              const career = currentCareers.find(c => normalizeString(c.name) === normalizeString(careerName) || normalizeString(c.code) === normalizeString(careerName));
              
              newStudentsToCreate.set(enrollment.toLowerCase(), {
                enrollment,
                first_name: firstName || 'Estudiante',
                last_name: lastName || 'Nuevo',
                name: `${firstName || 'Estudiante'} ${lastName || 'Nuevo'}`,
                group_id: group ? group.id : null,
                career_id: career ? career.id : null,
                status: 'active'
              });
            }
          }
        });

        if (newStudentsToCreate.size > 0) {
          const studentsToInsert = Array.from(newStudentsToCreate.values());
          if (isSupabaseConfigured) {
            const { data: inserted, error } = await supabase.from('students').upsert(studentsToInsert, { onConflict: 'enrollment' }).select();
            if (!error && inserted) {
              currentStudents = [...currentStudents, ...inserted];
              setStudents(currentStudents);
            }
          }
        }
      }

      console.log('Formateando datos finales...');
      const formattedData = data.map((item, index) => {
        const row: any = {};
        
        // Normalize item keys (handle Spanish headers and case-insensitivity)
        const normalizedItem: any = {};
        Object.entries(item).forEach(([key, val]) => {
          const k = normalizeString(key);
          normalizedItem[k] = val;
          // Common aliases
          if (k === 'grupo') {
            normalizedItem['name'] = val;
            normalizedItem['groups'] = val;
            normalizedItem['group'] = val;
          }
          if (k === 'cuatrimestre') normalizedItem['semester'] = val;
          if (k === 'alumnos') {
            normalizedItem['studentscount'] = val;
            normalizedItem['students_count'] = val;
          }
          if (k === 'carrera') {
            normalizedItem['career'] = val;
            normalizedItem['career_id'] = val;
          }
          if (k === 'modalidad') normalizedItem['modality'] = val;
          if (k === 'matricula' || k === 'matrícula') normalizedItem['enrollment'] = val;
          if (k === 'nombre' || k === 'nombre de la materia' || k === 'nombre completo' || k === 'full name') normalizedItem['name'] = val;
          if (k === 'apellido' || k === 'apellidos' || k === 'last name' || k === 'last_name') normalizedItem['last_name'] = val;
          if (k === 'nombre(s)' || k === 'first name' || k === 'first_name') normalizedItem['first_name'] = val;
          if (k === 'codigo' || k === 'código' || k === 'cdigo') normalizedItem['code'] = val;
          if (k === 'especialidad' || k === 'area' || k === 'área') normalizedItem['specialty'] = val;
          if (k === 'correo' || k === 'email') normalizedItem['email'] = val;
          if (k === 'tronco común' || k === 'tronco comun' || k === 'iscommoncore' || k === 'tipo') normalizedItem['iscommoncore'] = val;
          if (k === 'docente asignado' || k === 'docente' || k === 'maestro' || k === 'profesor' || k === 'teacher') normalizedItem['teacher'] = val;
          if (k === 'créditos' || k === 'creditos') normalizedItem['credits'] = val;
          if (k === 'numero de empleado' || k === 'num empleado' || k === 'employee id' || k === 'employee_id') normalizedItem['employeeid'] = val;
          
          // Debt specific aliases
          if (k === 'periodo' || k === 'period') normalizedItem['period'] = val;
          if (k === 'año' || k === 'year') normalizedItem['year'] = val;
          if (k === 'colegiatura' || k === 'tuition' || k === 'adeudo colegiatura') normalizedItem['tuition'] = val;
          if (k === 'reincorporacion' || k === 'reinstatement' || k === 'revoe' || k === 'adeudo reincorporacion') normalizedItem['reinstatement'] = val;
          if (k === 'pottencia' || k === 'powercourse' || k === 'curso potencia') normalizedItem['powercourse'] = val;
          if (k === 'gastos admin' || k === 'admin' || k === 'gastos administrativos') normalizedItem['admin'] = val;
          if (k === 'descuento' || k === 'discount' || k === 'porcentaje descuento') normalizedItem['discount'] = val;
          if (k === 'plantel' || k === 'campus') normalizedItem['campus'] = val;
          if (k === 'fecha' || k === 'date' || k === 'fecha adeudo') normalizedItem['date'] = val;
          if (k === 'otros' || k === 'other' || k === 'otros adeudos') normalizedItem['other'] = val;
        });

        Object.entries(mapping).forEach(([clientKey, dbKey]) => {
          let value = normalizedItem[clientKey.toLowerCase()];
          
          // Resolve Career Name to ID
          if (dbKey === 'career_id' && typeof value === 'string') {
            const normalizedValue = normalizeString(value);
            const career = currentCareers.find(c => 
              normalizeString(c.name) === normalizedValue || 
              normalizeString(c.code) === normalizedValue
            );
            value = career ? career.id : null;
            
            // If it's a subject and we found a career, also set the text 'career' field
            if (type === 'subject' && career) {
              row['career'] = career.name;
            }
          }

          // Resolve Group Name to ID
          if (dbKey === 'group_id' && typeof value === 'string') {
            const group = currentGroups.find(g => 
              g.name.toLowerCase().trim() === value.toLowerCase().trim()
            );
            value = group ? group.id : null;
          }

          // Resolve Teacher Name to ID
          if (dbKey === 'teacher_id' && typeof value === 'string') {
            const normalizedValue = normalizeString(value);
            const teacher = teachers.find(t => 
              normalizeString(t.name) === normalizedValue || 
              normalizeString(t.employeeId) === normalizedValue
            );
            value = teacher ? teacher.id : null;
          }

          // Resolve Student Enrollment to ID
          if (dbKey === 'student_id' && typeof value === 'string') {
            const normalizedValue = value.toLowerCase().trim();
            const student = currentStudents.find(s => 
              s.enrollment.toLowerCase().trim() === normalizedValue
            );
            value = student ? student.id : null;
          }

          // Resolve Subject Name to ID
          if (dbKey === 'subject_id' && typeof value === 'string') {
            const normalizedValue = normalizeString(value);
            const subject = currentSubjects.find(s => 
              normalizeString(s.name) === normalizedValue || 
              normalizeString(s.code) === normalizedValue
            );
            value = subject ? subject.id : null;
          }

          // Map Modality values
          if (dbKey === 'modality' && typeof value === 'string') {
            const mod = value.toLowerCase().trim();
            if (mod === 'presencial' || mod === 'escolarizada') value = 'Escolarizada';
            if (mod === 'online' || mod === 'ejecutiva') value = 'Ejecutiva';
            if (mod === 'híbrida' || mod === 'hibrida' || mod === 'sabatina') value = 'Sabatina';
          }

          // Map Boolean values (isCommonCore)
          if (dbKey === 'is_common_core') {
            if (typeof value === 'string') {
              const v = normalizeString(value);
              if (v === 'tronco comun' || v === 'tronco comun') {
                value = true;
              } else if (v === 'especialidad') {
                value = false;
              } else {
                value = v === 'true' || v === 'verdadero' || v === 'si' || v === '1';
              }
            } else {
              value = Boolean(value);
            }
          }

          if (value !== undefined && value !== null && value !== '') {
            row[dbKey] = value;
          }
        });
        
        // Ensure numeric fields are numbers correctly (handling 0)
        if (row.semester !== undefined && row.semester !== null) {
          if (type === 'subject' || type === 'student') {
            row.semester = parseInt(String(row.semester).replace(/[^0-9]/g, ''), 10) || 1;
          } else {
            row.semester = String(row.semester).trim();
          }
        }
        if (row.credits !== undefined) row.credits = Number(row.credits) || 0;
        
        // Defaults for Subjects
        if (type === 'subject') {
          if (!row.credits) row.credits = 8; // Default credits
          if (!row.evaluation_progress) row.evaluation_progress = 0;
          if (!row.is_common_core) row.is_common_core = false;
          
          // Generate code if missing
          if (!row.code && row.name) {
            row.code = row.name.split(' ').map(w => w[0]).join('').toUpperCase() + Math.floor(Math.random() * 1000);
          }
        }
        
        // Apply defaults for mandatory fields in Supabase
        if (type === 'subject') {
          if (row.credits === undefined) row.credits = 0;
          if (row.evaluation_progress === undefined) row.evaluation_progress = 0;
        }
        
        if (type === 'student') {
          if (!row.status) row.status = 'active';
          if (!row.semester) row.semester = '1';
        }
        
        if (type === 'group') {
          if (!row.name && !row.groups) {
            console.warn('Fila de grupo sin nombre detectada, saltando:', item);
            return null;
          }
          if (!row.semester) row.semester = '1';
        }

        if (type === 'debt') {
          if (!row.year) row.year = new Date().getFullYear();
          if (!row.debt_date) row.debt_date = new Date().toISOString().split('T')[0];
          if (!row.campus) row.campus = 'Principal';
        }

        if (type === 'subject' && !row.code) {
          console.warn('Fila de materia sin código detectada, saltando:', item);
          return null;
        }

        if (type === 'student' && !row.enrollment) {
          console.warn('Fila de alumno sin matrícula detectada, saltando:', item);
          return null;
        }

        if (type === 'teacher' && !row.employee_id) {
          console.warn('Fila de docente sin número de empleado detectada, saltando:', item);
          return null;
        }

        if (type === 'career' && !row.code) {
          console.warn('Fila de carrera sin código detectada, saltando:', item);
          return null;
        }

        if (type === 'debt' && !row.student_id) {
          console.warn('Fila de adeudo sin estudiante (matrícula) detectada, saltando:', item);
          return null;
        }

        if (type === 'grade' && (!row.student_id || !row.subject_id)) {
          console.warn('Fila de calificación sin estudiante o materia detectada, saltando:', item);
          return null;
        }

        return row;
      }).filter((item) => item !== null); // Remove null rows

      console.log(`Datos formateados: ${formattedData.length} filas listas para enviar`);

      if (isSupabaseConfigured && formattedData.length > 0) {
        // Deduplicate data based on conflict key to prevent "ON CONFLICT DO UPDATE command cannot affect row a second time" error
        const uniqueData = [];
        const seenKeys = new Set();
        
        // For groups, determine the conflict key dynamically
        const actualConflictKey = type === 'group' ? (formattedData[0].groups ? 'groups' : 'name') : onConflictKey;
        
        // Process from end to start to keep the last occurrence (most recent data in CSV)
        for (let i = formattedData.length - 1; i >= 0; i--) {
          const item = formattedData[i];
          const keyValue = item[actualConflictKey];
          
          if (keyValue && !seenKeys.has(keyValue)) {
            seenKeys.add(keyValue);
            uniqueData.unshift(item); // Add to beginning to maintain original order
          } else if (!keyValue) {
            // If no conflict key, just add it (though it should be filtered out earlier)
            uniqueData.unshift(item);
          }
        }

        console.log(`Enviando ${uniqueData.length} registros únicos a Supabase (de ${formattedData.length} originales):`, uniqueData);
        let error;
        
        if (type === 'group') {
          const { error: upsertError } = await supabase
            .from(tableName)
            .upsert(uniqueData, { onConflict: actualConflictKey });
          error = upsertError;
        } else {
          const { error: upsertError } = await supabase
            .from(tableName)
            .upsert(uniqueData, { onConflict: actualConflictKey });
          error = upsertError;
        }

        if (error) {
          console.error('Error de Supabase durante upsert:', error);
        } else {
          console.log('Upsert exitoso');
        }

        if (type === 'teacher' && !error) {
          // Create profiles for imported teachers
          const profilesToUpsert = uniqueData
            .filter((teacher: any) => teacher.email && teacher.name)
            .map((teacher: any) => {
              const emailPrefix = teacher.email.split('@')[0];
              const generatedPassword = `${emailPrefix}123`;
              
              return {
                name: teacher.name,
                username: teacher.name,
                email: teacher.email,
                pasword: generatedPassword,
                role: 'DOCENTE',
                avatar_url: null
              };
            });

          if (profilesToUpsert.length > 0) {
            // We use upsert here too to handle existing profiles gracefully
            const { error: profilesError } = await supabase
              .from('profiles')
              .upsert(profilesToUpsert, { onConflict: 'email' });
              
            if (profilesError) {
              console.error('Error creating profiles for imported teachers:', profilesError);
              showToast('Docentes importados, pero hubo un error al crear sus perfiles de usuario.', 'warning');
            } else {
              console.log('Perfiles de docentes creados exitosamente');
            }
          }
        }

        if (error) {
          // If it's a constraint error for groups, it might be because of duplicates
          if (type === 'group' && error.message.includes('duplicate key')) {
            showToast('Algunos grupos ya existen y no fueron sobrescritos.', 'warning');
          } else {
            throw error;
          }
        }
        
        showToast(`Sincronizado con Supabase: ${data.length} registros procesados.`);
        await fetchData();
        // Automatic sync after import
        setTimeout(() => syncAllAcademicLoad(true), 1500);
        logActivity(
          'Importación de datos',
          `Se importaron ${data.length} registros de tipo ${type}`,
          'import'
        );
        setLoading(false);
        return; // Exit early since fetchData updated the state
      }

      // Fallback local state update logic (only runs if Supabase is not configured)
      const processData = (prev: any[], keyField: string) => {
        const existingKeys = new Set(prev.map(item => String(item[keyField]).toLowerCase().trim()));
        const newItems: any[] = [];

        data.forEach(item => {
          const itemKey = String(item[keyField] || '').toLowerCase().trim();
          if (itemKey && !existingKeys.has(itemKey)) {
            newItems.push({
              ...item,
              id: item.id || Math.random().toString(36).substr(2, 9),
              status: item.status || 'active',
              evaluationProgress: Number(item.evaluationProgress) || 0,
              studentsCount: Number(item.studentsCount) || 0,
              semester: item.semester ? String(item.semester) : '1',
              credits: Number(item.credits) || item.credits
            });
            existingKeys.add(itemKey);
            addedCount++;
          } else {
            skippedCount++;
          }
        });

        return [...prev, ...newItems];
      };

      switch (type) {
        case 'student':
          setStudents(prev => processData(prev, 'enrollment'));
          break;
        case 'teacher':
          setTeachers(prev => processData(prev, 'employeeId'));
          break;
        case 'career':
          setCareers(prev => processData(prev, 'code'));
          break;
        case 'subject':
          setSubjects(prev => processData(prev, 'code'));
          break;
        case 'group':
          setGroups(prev => processData(prev, 'name'));
          break;
      }

    } catch (err: any) {
      console.error('Supabase Import Error:', err);
      showToast(`Error al guardar en Supabase: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const [unassignConfirmation, setUnassignConfirmation] = useState<{
    isOpen: boolean;
    subjectId: string;
    teacherName: string;
  }>({
    isOpen: false,
    subjectId: '',
    teacherName: ''
  });

  const handleRemoveSubject = (subjectId: string, teacherName: string) => {
    setUnassignConfirmation({ isOpen: true, subjectId, teacherName });
  };

  const confirmUnassign = async () => {
    const { subjectId } = unassignConfirmation;
    if (!subjectId) return;
    
    setLoading(true);
    try {
      if (isSupabaseConfigured) {
        const { error, data } = await supabase
          .from('subjects')
          .update({ teacher_id: null })
          .eq('id', subjectId)
          .select();

        if (error) {
          console.error('Supabase Deassignment Error:', error);
          throw new Error(error.message);
        }
        console.log('Supabase Deassignment Success:', data);
      }

      // Update local state immediately for better UX
      setSubjects(prev => prev.map(s => {
        if (s.id === subjectId) {
          return { ...s, teacher: undefined };
        }
        return s;
      }));
      
      showToast('Materia desasignada con éxito');
      
      // Refresh all data from Supabase to ensure everything is in sync
      await fetchData();
    } catch (err: any) {
      console.error('Final Deassignment Error:', err);
      showToast(`Error al desasignar materia: ${err.message}`, 'error');
    } finally {
      setLoading(false);
      setUnassignConfirmation(prev => ({ ...prev, isOpen: false }));
    }
  };

  const handleDirectAssignTeacher = async (subjectId: string, teacherId: string) => {
    setLoading(true);
    try {
      if (isSupabaseConfigured) {
        let updateData: any = { teacher_id: null };
        let teacherName = '';

        if (teacherId) {
            const selectedTeacher = teachers.find(t => t.id === teacherId);
            if (selectedTeacher) {
                updateData.teacher_id = selectedTeacher.id;
                teacherName = selectedTeacher.name;

                if (selectedTeacher.email) {
                  const { error: profileError } = await supabase
                    .from('profiles')
                    .update({ role: 'DOCENTE' })
                    .eq('email', selectedTeacher.email);
                  if (profileError) console.warn('Could not update profile role', profileError);
                }
            }
        }

        const { error: subjectError } = await supabase
          .from('subjects')
          .update(updateData)
          .eq('id', subjectId);

        if (subjectError) throw subjectError;

        setSubjects(prev =>
          prev.map(s =>
            s.id === subjectId
              ? { ...s, teacher: teacherName }
              : s
          )
        );
        
        // Update the view modal immediately if it is open
        setViewSubjectDetails(prev => prev && prev.id === subjectId ? { ...prev, teacher: teacherName } : prev);

        showToast(teacherName ? `Docente asignado exitosamente` : 'Materia desasignada exitosamente');
      }
    } catch (error: any) {
      console.error('Error assigning teacher directly:', error);
      showToast(`Error al asignar docente: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignSubject = async (subjectId: string, careerId?: string) => {
    if (!selectedTeacherForAssignment) return;
    
    setLoading(true);
    try {
      if (isSupabaseConfigured) {
        const updateData: any = { teacher_id: selectedTeacherForAssignment.id };
        
        if (careerId && careerId !== 'Todas') {
          const careerObj = careers.find(c => c.id === careerId || c.name === careerId);
          if (careerObj) {
            updateData.career = careerObj.name;
            updateData.is_common_core = false;
          }
        }

        // 1. Update the subject in Supabase to assign the teacher
        const { error: subjectError } = await supabase
          .from('subjects')
          .update(updateData)
          .eq('id', subjectId);

        if (subjectError) throw subjectError;

        // 2. Update the teacher's role in the profiles table to 'DOCENTE'
        // This ensures the user has the correct permissions if they log in
        if (selectedTeacherForAssignment.email) {
          const { error: profileError } = await supabase
            .from('profiles')
            .update({ role: 'DOCENTE' })
            .eq('email', selectedTeacherForAssignment.email);
          
          // We don't throw here if profile doesn't exist yet, as it might be a manual teacher entry
          if (profileError) console.warn('Could not update profile role:', profileError.message);
        }
      }

      setSubjects(prev => prev.map(s => {
        if (s.id === subjectId) {
          return { ...s, teacher: selectedTeacherForAssignment.name, teacher_id: selectedTeacherForAssignment.id };
        }
        return s;
      }));
      
      // Refresh all data from Supabase to ensure everything is in sync
      await fetchData();

      showToast(`Materia asignada con éxito a ${selectedTeacherForAssignment.name}`);
      setSelectedTeacherForAssignment(null);
    } catch (err: any) {
      console.error('Supabase Assignment Error:', err);
      showToast(`Error al asignar materia: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const teacherGroups = useMemo(() => {
    if (role !== 'DOCENTE' || !currentUser) return [];

    // Find the teacher record that matches the current user's email or name (case-insensitive)
    const teacherRecord = teachers.find(t => 
      (t.email && currentUser.email && t.email.toLowerCase().trim() === currentUser.email.toLowerCase().trim()) ||
      (t.name && currentUser.name && t.name.toLowerCase().trim() === currentUser.name.toLowerCase().trim()) ||
      t.id === currentUser.id ||
      t.employee_id === currentUser.id
    );
    const teacherId = teacherRecord?.id || currentUser.id;
    const teacherName = teacherRecord?.name || currentUser.name;

    const classesMap = new Map<string, any>();

    // 1. Direct matches on groups table
    const directMatches = groups.filter(g => 
      g.teacher_id === teacherId || 
      (g.teacher && teacherName && cleanText(g.teacher) === cleanText(teacherName))
    );
    
    directMatches.forEach(g => {
      const subjectName = (g.subject || 'Sin materia').trim();
      const subjectObj = subjects.find(s => cleanText(s.name) === cleanText(subjectName) || cleanText(s.code) === cleanText(subjectName));
      const subjectId = subjectObj?.id || subjectName;
      const classId = `${g.id}-${subjectId}`;

      const groupStudents = students.filter(s => {
        const studentGroupId = String(s.group_id || s.group || s.groupId || '').trim();
        const isInGroup = studentGroupId && (studentGroupId === String(g.id) || cleanText(studentGroupId) === cleanText(g.name));
        
        if (subjectObj) {
          const studentGroup = studentGroupId ? groups.find(gr => String(gr.id) === studentGroupId || cleanText(gr.name) === cleanText(studentGroupId)) : null;
          const studentSemesters = getSemesters(s.semester || s.cuatrimestre || studentGroup?.semester || studentGroup?.name || 0);
          const studentCareerVal = s.career_id || s.career || studentGroup?.career_id || studentGroup?.career;
          const sSemesters = getSemesters(subjectObj.semester || 0);
          const sCareerVal = subjectObj.career_id || subjectObj.careerId || subjectObj.career;
          
          const getCareerIdLocal = (val: any) => {
            if (!val) return null;
            const valStr = String(val).trim();
            const career = careers.find(c => 
              String(c.id) === valStr || 
              cleanText(c.code) === cleanText(valStr) || 
              cleanText(c.name) === cleanText(valStr)
            );
            return career ? String(career.id) : valStr;
          };

          const studentCareerId = getCareerIdLocal(studentCareerVal);
          const sCareerId = getCareerIdLocal(sCareerVal);
          
          const matchesSemesterAndCareer = studentSemesters.some(sem => sSemesters.includes(sem)) && (subjectObj.isCommonCore || (studentCareerId && sCareerId && studentCareerId === sCareerId));
          return isInGroup || matchesSemesterAndCareer;
        }
        return isInGroup;
      });

      const capturedGrades = partialGrades.filter(pg => 
        pg.group_id === g.id && 
        (pg.subject_id === subjectId || pg.subject_id === subjectName)
      );
      
      const progress = groupStudents.length > 0 
        ? Math.round((capturedGrades.length / groupStudents.length) * 100)
        : 0;

      classesMap.set(classId, {
        id: classId,
        groupId: g.id,
        subjectId: subjectObj?.id || subjectId,
        name: g.name,
        subject: subjectName,
        semester: g.semester,
        studentsCount: groupStudents.length,
        students: groupStudents,
        captureProgress: progress,
        originalGroup: g,
        originalSubject: subjectObj,
        career: g.career,
        modality: g.modality
      });
    });
    
    // 2. Find subjects assigned to this teacher in the subjects table
    const mySubjects = subjects.filter(s => {
      const match1 = s.teacher_id && s.teacher_id === teacherId;
      const match2 = s.teacher && teacherName && s.teacher.toLowerCase().trim() === teacherName.toLowerCase().trim();
      const match3 = s.teacher_id && teacherRecord && s.teacher_id === teacherRecord.id;
      return match1 || match2 || match3;
    });

    console.log('Teacher ID:', teacherId);
    console.log('Teacher Name:', teacherName);
    console.log('My Subjects:', mySubjects);

    // 3. Find groups that match these subjects
    mySubjects.forEach(subject => {
      // Resolve subject career to ID if possible
      const subjectCareer = subject.career_id || subject.career;
      let subjectCareerId = null;
      if (subjectCareer) {
           const c = careers.find(c => 
             c.name?.toLowerCase().trim() === String(subjectCareer).toLowerCase().trim() || 
             c.code?.toLowerCase().trim() === String(subjectCareer).toLowerCase().trim() || 
             c.id === subjectCareer
           );
           if (c) subjectCareerId = c.id;
      }

      const matchingGroups = groups.filter(g => {
        // Direct link via subject.group_id (New)
        if (subject.group_id && String(subject.group_id) === String(g.id)) {
          return true;
        }

        // Direct link via group.subject_id (Legacy/Alternative)
        const gSubjectId = g.subject_id || g.subjectId;
        if (gSubjectId && String(gSubjectId) === String(subject.id)) {
          return true;
        }

        // If group has a specific subject name assigned, it MUST match
        if (g.subject && subject.name && g.subject.toLowerCase().trim() !== subject.name.toLowerCase().trim()) {
          return false;
        }

        // Match Semester
        const groupSem = String(g.semester || '').replace(/\D/g, '').trim();
        const subjectSem = String(subject.semester || '').replace(/\D/g, '').trim();
        
        // If both have semesters, they must match.
        if (groupSem && subjectSem && groupSem !== subjectSem) {
          return false;
        }

        // Match Career
        let careerMatch = false;
        if (subject.isCommonCore || subject.career === 'Todas' || !subjectCareer) {
            careerMatch = true;
        } else {
            const groupCareerId = g.career_id || g.career; 
            if (subjectCareerId && groupCareerId) {
                careerMatch = String(subjectCareerId) === String(groupCareerId);
            } 
            if (!careerMatch) {
                const groupCareerObj = careers.find(c => c.id === groupCareerId || c.code === groupCareerId || c.name === groupCareerId);
                const groupCareerName = groupCareerObj ? groupCareerObj.name : groupCareerId;
                careerMatch = String(groupCareerName).toLowerCase().trim() === String(subjectCareer).toLowerCase().trim() || 
                             String(groupCareerId).toLowerCase().trim() === String(subjectCareer).toLowerCase().trim();
            }
        }
        return careerMatch;
      });
      
      console.log(`Subject ${subject.name} matching groups:`, matchingGroups);
      
      if (matchingGroups.length === 0) {
        // Fallback: If no groups match, still show the subject so the teacher knows they are assigned
        // We'll calculate students based on semester and career directly
        const getSemesters = (v: any): number[] => {
          if (v === null || v === undefined) return [0];
          // Extract all numbers from the string (e.g., "7 y 8" -> [7, 8])
          const matches = String(v).match(/\d+/g);
          if (!matches) return [0];
          return matches.map(n => Number(n));
        };

        const subjectStudents = students.filter(s => {
          const studentGroupId = String(s.group_id || s.group || s.groupId || '').trim();
          const studentGroup = studentGroupId ? groups.find(g => String(g.id) === studentGroupId || String(g.name).trim() === studentGroupId) : null;
          const studentSemesters = getSemesters(s.semester || s.cuatrimestre || studentGroup?.semester || studentGroup?.name || 0);
          const studentCareerVal = s.career_id || s.career || studentGroup?.career_id || studentGroup?.career;
          const sSemesters = getSemesters(subject.semester || 0);
          
          const getCareerIdLocal = (val: any) => {
            if (!val) return null;
            const valStr = String(val).trim();
            const career = careers.find(c => 
              String(c.id) === valStr || 
              String(c.code).toLowerCase() === valStr.toLowerCase() || 
              String(c.name).toLowerCase() === valStr.toLowerCase()
            );
            return career ? String(career.id) : valStr;
          };

          const studentCareerId = getCareerIdLocal(studentCareerVal);
          const sCareerId = getCareerIdLocal(subjectCareer);
          
          return studentSemesters.some(sem => sSemesters.includes(sem)) && (subject.isCommonCore || subject.career === 'Todas' || !subjectCareer || (studentCareerId && sCareerId && studentCareerId === sCareerId));
        });

        if (subjectStudents.length > 0) {
          // Try to find the most common group among these students
          const groupCounts: Record<string, number> = {};
          subjectStudents.forEach(s => {
            const gid = String(s.group_id || s.group || s.groupId || '').trim();
            if (gid) groupCounts[gid] = (groupCounts[gid] || 0) + 1;
          });
          
          const sortedGroups = Object.entries(groupCounts).sort((a, b) => b[1] - a[1]);
          const bestGroupId = sortedGroups.length > 0 ? sortedGroups[0][0] : null;
          const bestGroup = bestGroupId ? groups.find(g => String(g.id) === bestGroupId || cleanText(g.name) === cleanText(bestGroupId)) : null;

          const classId = bestGroup ? `${bestGroup.id}-${subject.id}` : `no-group-${subject.id}`;
          
          if (!classesMap.has(classId)) {
            const capturedGrades = partialGrades.filter(pg => 
              (bestGroup && pg.group_id === bestGroup.id) && 
              (pg.subject_id === subject.id || pg.subject_id === subject.name)
            );
            
            const progress = subjectStudents.length > 0 
              ? Math.round((capturedGrades.length / subjectStudents.length) * 100)
              : 0;

            classesMap.set(classId, {
              id: classId,
              groupId: bestGroup?.id || null,
              subjectId: subject.id,
              name: bestGroup ? bestGroup.name : 'Alumnos sin grupo asignado',
              subject: subject.name,
              semester: subject.semester,
              studentsCount: subjectStudents.length,
              students: subjectStudents,
              captureProgress: progress,
              originalGroup: bestGroup || null,
              originalSubject: subject,
              career: subject.career,
              modality: bestGroup?.modality || 'N/A'
            });
          }
        }
      } else {
        matchingGroups.forEach(g => {
          const classId = `${g.id}-${subject.id}`;
          if (classesMap.has(classId)) return;

          const groupStudents = students.filter(s => {
            const studentGroupId = String(s.group_id || s.group || s.groupId || '').trim();
            const isInGroup = studentGroupId && (studentGroupId === String(g.id) || studentGroupId === String(g.name).trim());
            
            const getSemesters = (v: any): number[] => {
              if (v === null || v === undefined) return [0];
              // Extract all numbers from the string (e.g., "7 y 8" -> [7, 8])
              const matches = String(v).match(/\d+/g);
              if (!matches) return [0];
              return matches.map(n => Number(n));
            };
            const studentGroup = studentGroupId ? groups.find(gr => String(gr.id) === studentGroupId || String(gr.name).trim() === studentGroupId) : null;
            const studentSemesters = getSemesters(s.semester || s.cuatrimestre || studentGroup?.semester || studentGroup?.name || 0);
            const studentCareerVal = s.career_id || s.career || studentGroup?.career_id || studentGroup?.career;
            const sSemesters = getSemesters(subject.semester || 0);
            const sCareerVal = subject.career_id || subject.careerId || subject.career;
            
            const getCareerIdLocal = (val: any) => {
              if (!val) return null;
              const valStr = String(val).trim();
              const career = careers.find(c => 
                String(c.id) === valStr || 
                String(c.code).toLowerCase() === valStr.toLowerCase() || 
                String(c.name).toLowerCase() === valStr.toLowerCase()
              );
              return career ? String(career.id) : valStr;
            };

            const studentCareerId = getCareerIdLocal(studentCareerVal);
            const sCareerId = getCareerIdLocal(sCareerVal);
            
            const matchesSemesterAndCareer = studentSemesters.some(sem => sSemesters.includes(sem)) && (subject.isCommonCore || (studentCareerId && sCareerId && studentCareerId === sCareerId));
            return isInGroup || matchesSemesterAndCareer;
          });

          const capturedGrades = partialGrades.filter(pg => 
            pg.group_id === g.id && 
            pg.subject_id === subject.id
          );
          
          const progress = groupStudents.length > 0 
            ? Math.round((capturedGrades.length / groupStudents.length) * 100)
            : 0;

          classesMap.set(classId, {
              id: classId,
              groupId: g.id,
              subjectId: subject.id,
              name: g.name,
              subject: subject.name,
              semester: g.semester,
              studentsCount: groupStudents.length,
              students: groupStudents,
              captureProgress: progress,
              originalGroup: g,
              originalSubject: subject,
              career: g.career,
              modality: g.modality
          });
        });
      }
    });
    
    return Array.from(classesMap.values());
  }, [role, currentUser, subjects, groups, careers, students, partialGrades]);

  const handleExportReport = (type: 'csv' | 'excel') => {
    const fileName = 'reporte_general_utc';

    const rendimientoData: any[] = []; // Data to be populated from backend

    if (type === 'csv') {
      // For CSV, we can only export one sheet. We'll export Rendimiento.
      const csv = Papa.unparse(rendimientoData);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${fileName}_rendimiento.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const workbook = XLSX.utils.book_new();

      // 1. Rendimiento
      const wsRendimiento = XLSX.utils.json_to_sheet(rendimientoData);
      XLSX.utils.book_append_sheet(workbook, wsRendimiento, 'Rendimiento');

      // 2. Alumnos
      const alumnosData = students.map(s => {
        const career = careers.find(c => c.id === s.career || c.code === s.career);
        const group = groups.find(g => g.id === s.group || g.name === s.group);
        return {
          Matrícula: s.enrollment,
          'Nombre Completo': s.name,
          Carrera: career ? career.name : s.career,
          Cuatrimestre: `${s.semester}°`,
          Grupo: group ? group.name : s.group,
          Modalidad: s.modality,
          Estado: s.status === 'active' ? 'Activo' : 'Inactivo'
        };
      });
      const wsAlumnos = XLSX.utils.json_to_sheet(alumnosData);
      XLSX.utils.book_append_sheet(workbook, wsAlumnos, 'Alumnos');

      // 3. Profesores
      const profesoresData = teachers.map(t => {
        const assigned = subjects.filter(s => s.teacher === t.name);
        return {
          'ID Empleado': t.employeeId,
          'Nombre Completo': t.name,
          Especialidad: t.specialty,
          Materias: assigned.map(s => s.name).join(', '),
          'Correo Institucional': t.email
        };
      });
      const wsProfesores = XLSX.utils.json_to_sheet(profesoresData);
      XLSX.utils.book_append_sheet(workbook, wsProfesores, 'Profesores');

      // 4. Carreras
      const carrerasData = careers.map(c => ({
        Código: c.code,
        'Nombre de la Carrera': c.name,
        'Jefe de Carrera': c.headOfCareer || 'Por asignar'
      }));
      const wsCarreras = XLSX.utils.json_to_sheet(carrerasData);
      XLSX.utils.book_append_sheet(workbook, wsCarreras, 'Carreras');

      // 5. Materias
      const materiasData = subjects.map(s => ({
        Código: s.code,
        'Nombre de la Materia': s.name,
        'Docente Asignado': s.teacher || 'No asignado',
        Cuatrimestre: `${s.semester}°`,
        'Progreso (%)': s.evaluationProgress || 0
      }));
      const wsMaterias = XLSX.utils.json_to_sheet(materiasData);
      XLSX.utils.book_append_sheet(workbook, wsMaterias, 'Materias');

      // 6. Grupos
      const gruposData = groups.map(g => {
        const career = careers.find(c => c.id === g.career || c.name === g.career || c.code === g.career);
        return {
          Grupo: g.name,
          Cuatrimestre: g.semester,
          'Alumnos Inscritos': g.studentsCount,
          Carrera: career ? career.name : g.career,
          Modalidad: g.modality
        };
      });
      const wsGrupos = XLSX.utils.json_to_sheet(gruposData);
      XLSX.utils.book_append_sheet(workbook, wsGrupos, 'Grupos');

      XLSX.writeFile(workbook, `${fileName}.xlsx`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }



  const renderContent = () => {
    if (activeTab === 'settings') {
      return (
        <SettingsView 
          user={currentUser!} 
          onUpdateUser={handleUpdateProfile} 
          onPasswordChange={handlePasswordChange}
        />
      );
    }

    if (role === 'ADMIN') {
      switch (activeTab) {
        case 'dashboard':
          return (
            <AdminDashboard 
              careers={careers.map(c => c.name)} 
              semesters={(Array.from(new Set(groups.map(g => g.semester))) as string[]).sort()} 
              onNavigate={handleTabChange}
              onExport={handleExportReport}
              onSync={syncAllAcademicLoad}
              stats={{
                students: students.length,
                teachers: teachers.length,
                groups: groups.length,
                subjects: subjects.length
              }}
              history={history}
              rendimientoData={rendimientoData}
            />
          );
        case 'students':
          return (
            <ManagementTable 
              key="student"
              title="Gestión de Alumnos" 
              subtitle="Administra la información de todos los estudiantes inscritos."
              type="student"
              columns={[
                { key: 'enrollment', label: 'Matrícula', render: (val) => <span className="font-mono font-bold text-slate-400 dark:text-slate-500">{val}</span> },
                { key: 'name', label: 'Nombre Completo', render: (val) => <span className="font-bold text-slate-800 dark:text-white">{val}</span> },
                { key: 'career', label: 'Carrera', render: (val) => {
                  const career = careers.find(c => c.id === val || c.code === val);
                  return <span className="text-slate-600 dark:text-slate-300">{career ? career.name : val}</span>;
                }, exportValue: (val) => {
                  const career = careers.find(c => c.id === val || c.code === val);
                  return career ? career.name : val;
                }},
                { key: 'semester', label: 'Cuatrimestre', render: (val) => <span className="text-slate-600 dark:text-slate-300">{val}°</span> },
                { key: 'group', label: 'Grupo', render: (val) => {
                  const group = groups.find(g => g.id === val || g.name === val);
                  return <span className="text-slate-600 dark:text-slate-300">{group ? group.name : val}</span>;
                }, exportValue: (val) => {
                  const group = groups.find(g => g.id === val || g.name === val);
                  return group ? group.name : val;
                }},
                { key: 'modality', label: 'Modalidad', render: (val) => (
                  <span className={cn(
                    "px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                    val === 'Escolarizada' ? "bg-blue-50 text-blue-600" : 
                    val === 'Ejecutiva' ? "bg-amber-50 text-amber-600" : 
                    "bg-purple-50 text-purple-600"
                  )}>
                    {val}
                  </span>
                )},
                { key: 'status', label: 'Estado', render: (val) => (
                  <span className={cn(
                    "px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                    val === 'active' ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"
                  )}>
                    {val === 'active' ? 'Activo' : 'Inactivo'}
                  </span>
                ), exportValue: (val) => val === 'active' ? 'Activo' : 'Inactivo'}
              ]}
              data={students}
              onAdd={() => openManagementModal('student')}
              onEdit={(item) => handleEdit(item, 'student')}
              onDelete={(item) => handleDelete(item.id, 'student')}
              onImport={async (data) => {
                await handleImport(data, 'student');
              }}
              filterConfigs={[
                {
                  key: 'career',
                  label: 'Carrera',
                  options: [
                    { label: 'Tronco Común (Todas)', value: 'Todas' },
                    ...careers.map(c => ({ label: c.name, value: c.name }))
                  ]
                },
                {
                  key: 'semester',
                  label: 'Cuatrimestre',
                  options: Array.from({ length: 10 }, (_, i) => ({
                    label: `${i + 1}° Cuatrimestre`,
                    value: String(i + 1)
                  }))
                }
              ]}
            />
          );
        case 'teachers':
          return (
            <ManagementTable 
              key="teacher"
              title="Gestión de Profesores" 
              subtitle="Directorio de personal docente y sus especialidades."
              type="teacher"
              columns={[
                { key: 'employeeId', label: 'ID Empleado', render: (val) => <span className="font-mono font-bold text-slate-400 dark:text-slate-500">{val}</span> },
                { key: 'name', label: 'Nombre Completo', render: (val) => <span className="font-bold text-slate-800 dark:text-white">{val}</span> },
                { key: 'specialty', label: 'Especialidad', render: (val) => <span className="text-slate-600 dark:text-slate-300">{val}</span> },
                { key: 'id', label: 'Materias', render: (_, teacher) => {
                  const assigned = subjects.filter(s => s.teacher === teacher.name);
                  return (
                    <div className="flex flex-wrap gap-1 items-center">
                      {assigned.map(s => (
                        <span 
                          key={s.id} 
                          onClick={() => setViewSubjectDetails(s)}
                          className="group flex items-center gap-1.5 px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-bold rounded-md border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-900/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer transition-all" 
                          title="Ver detalles"
                        >
                          {s.code} ({s.studentsCount || 0})
                          <button 
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleRemoveSubject(s.id, teacher.name);
                            }}
                            className="p-0.5 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded text-slate-400 hover:text-rose-600 transition-colors"
                            title="Quitar materia"
                          >
                            <X size={10} />
                          </button>
                        </span>
                      ))}
                      <button 
                        onClick={() => setSelectedTeacherForAssignment(teacher)}
                        className="p-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-md hover:bg-blue-600 hover:text-white transition-all ml-1 shadow-sm"
                        title="Asignar Materia"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  );
                }, exportValue: (_, teacher) => {
                  const assigned = subjects.filter(s => s.teacher === teacher.name);
                  return assigned.map(s => s.name).join(', ');
                }},
                { key: 'email', label: 'Correo Institucional', render: (val) => <span className="text-slate-600 dark:text-slate-400">{val}</span> },
              ]}
              data={teachers}
              onAdd={() => openManagementModal('teacher')}
              onEdit={(item) => handleEdit(item, 'teacher')}
              onDelete={(item) => handleDelete(item.id, 'teacher')}
              onImport={async (data) => {
                await handleImport(data, 'teacher');
              }}
            />
          );
        case 'groups':
          return (
            <ManagementTable 
              key="group"
              title="Gestión de Grupos" 
              subtitle="Configuración de grupos, modalidades y carreras asignadas."
              type="group"
              onRowClick={(group) => setSelectedGroupDetails(group)}
              columns={[
                { key: 'name', label: 'Grupo', render: (val) => <span className="font-bold text-slate-800 dark:text-white">{val}</span> },
                { key: 'semester', label: 'Cuatrimestre', render: (val) => <span className="text-slate-600 dark:text-slate-300">{val}</span> },
                { key: 'studentsCount', label: 'Alumnos', render: (val) => <span className="font-medium text-slate-600 dark:text-slate-400">{val} Inscritos</span> },
                { key: 'career', label: 'Carrera', render: (val) => {
                  const career = careers.find(c => c.id === val || c.name === val || c.code === val);
                  return <span className="text-slate-600 dark:text-slate-300">{career ? career.name : val}</span>;
                }, exportValue: (val) => {
                  const career = careers.find(c => c.id === val || c.name === val || c.code === val);
                  return career ? career.name : val;
                }},
                { key: 'modality', label: 'Modalidad', render: (val) => (
                  <span className={cn(
                    "px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                    val === 'Escolarizada' ? "bg-blue-50 text-blue-600" : 
                    val === 'Ejecutiva' ? "bg-amber-50 text-amber-600" : 
                    "bg-purple-50 text-purple-600"
                  )}>
                    {val}
                  </span>
                )},
              ]}
              data={groups}
              onAdd={() => openManagementModal('group')}
              onEdit={(item) => handleEdit(item, 'group')}
              onDelete={(item) => handleDelete(item.id, 'group')}
              onImport={async (data) => {
                await handleImport(data, 'group');
              }}
              filterConfigs={[
                {
                  key: 'career',
                  label: 'Carrera',
                  options: [
                    { label: 'Ingeniería de Sistemas Computacionales', value: 'Ingeniería de Sistemas Computacionales' },
                    { label: 'Licenciatura en Administración', value: 'Licenciatura en Administración' },
                    { label: 'Licenciatura en Psicología', value: 'Licenciatura en Psicología' },
                  ]
                },
                {
                  key: 'modality',
                  label: 'Modalidad',
                  options: [
                    { label: 'Escolarizada', value: 'Escolarizada' },
                    { label: 'Ejecutiva', value: 'Ejecutiva' },
                    { label: 'Sabatina', value: 'Sabatina' },
                  ]
                },
                {
                  key: 'semester',
                  label: 'Cuatrimestre',
                  options: [
                    { label: '1er', value: '1' },
                    { label: '2do', value: '2' },
                    { label: '3er', value: '3' },
                    { label: '4to', value: '4' },
                    { label: '5to', value: '5' },
                    { label: '6to', value: '6' },
                    { label: '7mo', value: '7' },
                    { label: '8vo', value: '8' },
                    { label: '9no', value: '9' },
                  ]
                }
              ]}
            />
          );
        case 'subjects':
          return (
            <div className="space-y-4">
              <div className="flex justify-end px-4">
                <button
                  onClick={handleSyncEnrollments}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2"
                  title="Sincronizar alumnos con materias según cuatrimestre y carrera"
                >
                  <Check size={14} /> Sincronizar Inscripciones
                </button>
              </div>
              <ManagementTable 
                key="subject"
                title="Gestión de Materias" 
                subtitle="Catálogo de materias por cuatrimestre, créditos y docente asignado."
                type="subject"
                columns={[
                { key: 'code', label: 'Código', render: (val) => <span className="font-mono font-bold text-slate-400 dark:text-slate-500">{val}</span> },
                { key: 'name', label: 'Nombre de la Materia', render: (val) => <span className="font-bold text-slate-800 dark:text-white">{val}</span> },
                { key: 'studentsCount', label: 'Alumnos', render: (val) => <span className="text-slate-600 dark:text-slate-400 font-medium">{val || 0}</span> },
                { key: 'career', label: 'Carrera', render: (val) => <span className="text-xs text-slate-500 dark:text-slate-400 max-w-[150px] truncate block" title={val}>{val || 'N/A'}</span> },
                { key: 'isCommonCore', label: 'Tipo', render: (val) => (
                  <span className={cn(
                    "px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider whitespace-nowrap",
                    val ? "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400" : "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                  )}>
                    {val ? 'Tronco Común' : 'Especialidad'}
                  </span>
                )},
                { key: 'teacher', label: 'Docente Asignado', render: (val) => <span className="text-slate-600 dark:text-slate-300 font-medium">{val || 'No asignado'}</span> },
                { key: 'semester', label: 'Cuatrimestre', render: (val) => <span className="text-slate-600 dark:text-slate-300">{val}°</span> },
                { key: 'evaluationProgress', label: 'Progreso', render: (val) => (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 w-16 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full transition-all duration-500",
                          val === 100 ? "bg-emerald-500" : val > 50 ? "bg-blue-500" : "bg-amber-500"
                        )}
                        style={{ width: `${val}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-black text-slate-400">{val}%</span>
                  </div>
                )},
                { key: 'id', label: 'Detalles', render: (_, row) => (
                  <button 
                    onClick={() => setSelectedSubject(row)}
                    className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm flex items-center gap-2 text-xs font-bold"
                  >
                    <Eye size={14} /> Ver Evaluación
                  </button>
                ), excludeFromExport: true}
              ]}
              data={subjects}
              onAdd={() => openManagementModal('subject')}
              onEdit={(item) => handleEdit(item, 'subject')}
              onDelete={(item) => handleDelete(item.id, 'subject')}
              onImport={async (data) => {
                await handleImport(data, 'subject');
              }}
              filterConfigs={[
                {
                  key: 'career',
                  label: 'Carrera',
                  options: [
                    { label: 'Todas / Tronco Común', value: 'Todas' },
                    ...careers.map(c => ({ label: c.name, value: c.name }))
                  ]
                },
                {
                  key: 'isCommonCore',
                  label: 'Tipo',
                  options: [
                    { label: 'Tronco Común', value: 'true' },
                    { label: 'Especialidad', value: 'false' },
                  ]
                },
                {
                  key: 'semester',
                  label: 'Cuatrimestre',
                  options: [
                    { label: '1er', value: '1' },
                    { label: '2do', value: '2' },
                    { label: '3er', value: '3' },
                    { label: '4to', value: '4' },
                    { label: '5to', value: '5' },
                    { label: '6to', value: '6' },
                    { label: '7mo', value: '7' },
                    { label: '8vo', value: '8' },
                    { label: '9no', value: '9' },
                  ]
                }
              ]}
            />
          </div>
        );
      case 'careers':
          return (
            <ManagementTable 
              key="career"
              title="Gestión de Carreras" 
              subtitle="Administración de programas académicos."
              type="career"
              columns={[
                { key: 'code', label: 'Código', render: (val) => <span className="font-mono font-bold text-slate-400 dark:text-slate-500">{val}</span> },
                { key: 'name', label: 'Nombre de la Carrera', render: (val) => <span className="font-bold text-slate-800 dark:text-white">{val}</span> },
                { key: 'headOfCareer', label: 'Jefe de Carrera', render: (val) => <span className="text-slate-600 dark:text-slate-300 font-medium">{val || 'Por asignar'}</span> },
              ]}
              data={careers}
              onAdd={() => openManagementModal('career')}
              onEdit={(item) => handleEdit(item, 'career')}
              onDelete={(item) => handleDelete(item.id, 'career')}
              onImport={async (data) => {
                await handleImport(data, 'career');
              }}
            />
          );
        case 'teams':
          if (selectedTeamGroup) {
            const groupStudents = students.filter(s => {
              const studentGroupId = String(s.group_id || s.group || s.groupId || '').trim();
              return studentGroupId === String(selectedTeamGroup.id) || studentGroupId === String(selectedTeamGroup.name).trim();
            });
            const careerValue = selectedTeamGroup.career || selectedTeamGroup.career_id || selectedTeamGroup.careerId;
            let career = careers.find(c => 
              String(c.id) === String(careerValue) || 
              String(c.name).toLowerCase() === String(careerValue || '').toLowerCase() || 
              String(c.code).toLowerCase() === String(careerValue || '').toLowerCase()
            );
            
            const groupSemesters = String(selectedTeamGroup.semester).match(/\d+/g)?.map(Number) || [];
            const groupSubjects = subjects.filter(s => {
              const sSemesters = String(s.semester).match(/\d+/g)?.map(Number) || [];
              return groupSemesters.some(sem => sSemesters.includes(sem));
            });

            // Fallback to determine career from subjects if group lacks specific career
            if (!career && groupSubjects.length > 0) {
              const subjectCareerId = groupSubjects.find(s => s.career && s.career !== 'Todas')?.career;
              if (subjectCareerId) {
                career = careers.find(c => 
                  String(c.id) === String(subjectCareerId) || 
                  String(c.name).toLowerCase() === String(subjectCareerId).toLowerCase() || 
                  String(c.code).toLowerCase() === String(subjectCareerId).toLowerCase()
                );
              }
            }

            const groupTeachers = Array.from(new Set(groupSubjects.map(s => s.teacher).filter(Boolean)));
            const groupHeadOfCareer = career?.headOfCareer || career?.head_of_career;
            
            let allHeadsOfCareer = Array.from(new Set(careers.map(c => c.headOfCareer || c.head_of_career).filter(Boolean)));
            // Bring the matching head of career to the top of the list
            if (groupHeadOfCareer && allHeadsOfCareer.includes(groupHeadOfCareer)) {
                allHeadsOfCareer = [groupHeadOfCareer, ...allHeadsOfCareer.filter(h => h !== groupHeadOfCareer)];
            }

            const toggleOwner = (ownerName: string) => {
              setSelectedTeamOwners(prev => 
                prev.includes(ownerName) 
                  ? prev.filter(o => o !== ownerName)
                  : [...prev, ownerName]
              );
            };

            return (
              <div className="space-y-6">
                <div className="flex items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => {
                        setSelectedTeamGroup(null);
                        setSelectedTeamOwners([]);
                      }}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    >
                      <ArrowLeft size={20} />
                    </button>
                    <div>
                      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Equipos de Trabajo</h1>
                      <p className="text-slate-500 dark:text-slate-400">Grupo {selectedTeamGroup.name} • {career?.name || selectedTeamGroup.career}</p>
                    </div>
                  </div>
                  <div>
                    <button 
                      onClick={() => handleCreateMSTeam(selectedTeamGroup)}
                      disabled={isCreatingTeam}
                      className={cn(
                        "px-5 py-2.5 text-white rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2 shadow-lg",
                        selectedTeamGroup.team_created ? "bg-amber-600 hover:bg-amber-700 shadow-amber-600/20" : "bg-blue-600 hover:bg-blue-700 shadow-blue-600/20"
                      )}
                    >
                      {isCreatingTeam ? <Loader2 size={18} className="animate-spin" /> : (selectedTeamGroup.team_created ? <Edit2 size={18} /> : <UserPlus size={18} />)}
                      {isCreatingTeam ? 'Sincronizando...' : (selectedTeamGroup.team_created ? 'Actualizar Equipo' : 'Crear Nuevo Equipo')}
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Left Column: Group Details & Subjects */}
                  <div className="col-span-1 flex flex-col h-[600px]">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col flex-1 min-h-0">
                      <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-4 shrink-0">
                        <Users size={18} className="text-blue-500" />
                        Alumnos del Grupo
                      </h3>
                      <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1 min-h-0">
                        {groupStudents.length > 0 ? (
                          groupStudents.map(student => (
                            <div key={student.id} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex items-center justify-between border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition shrink-0">
                              <div>
                                <p className="text-sm font-bold text-slate-800 dark:text-white">{student.name}</p>
                                <p className="text-xs text-slate-500">{student.enrollment}</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8 text-slate-400">
                            <p className="text-sm">No hay alumnos asignados a este grupo.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Center Column: Materias */}
                  <div className="col-span-1 flex flex-col h-[600px]">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col flex-1 min-h-0">
                      <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-4 shrink-0">
                        <BookOpen size={18} className="text-emerald-500" />
                        Materias Correspondientes
                      </h3>
                      <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1 min-h-0">
                        {groupSubjects.length > 0 ? (
                          groupSubjects.map(subject => (
                            <div 
                              key={subject.id} 
                              onClick={() => setViewSubjectDetails(subject)}
                              className={cn(
                                "p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex items-center justify-between transition shrink-0 border-l-4 cursor-pointer",
                                subject.teacher 
                                  ? "border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/10" 
                                  : "border-red-500 hover:bg-red-50 dark:hover:bg-red-900/10"
                              )}
                            >
                              <div>
                                <p className="text-sm font-bold text-slate-800 dark:text-white">{subject.name}</p>
                                <p className={cn(
                                  "text-xs font-medium",
                                  subject.teacher ? "text-slate-500" : "text-red-500 dark:text-red-400"
                                )}>
                                  {subject.teacher || 'Sin docente asignado'}
                                </p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8 text-slate-400">
                            <p className="text-sm">No hay materias para el cuatrimestre de este grupo.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Owners */}
                  <div className="col-span-1 flex flex-col h-[600px]">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col flex-1 min-h-0">
                      <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-4 shrink-0">
                        <Shield size={18} className="text-purple-500" />
                        Propietarios del Equipo
                      </h3>
                      <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar flex-1 min-h-0">
                        
                        {/* Jefes de Carrera */}
                        <div>
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Jefe de Carrera</h4>
                          <div className="space-y-2">
                            <button
                              onClick={() => setIsHeadsDropdownOpen(!isHeadsDropdownOpen)}
                              disabled={allHeadsOfCareer.length === 0}
                              className="w-full text-left px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <div>
                                <p className="text-sm font-bold text-slate-800 dark:text-white">
                                  {allHeadsOfCareer.length > 0 
                                    ? `Seleccionar Jefes de Carrera (${allHeadsOfCareer.filter(h => selectedTeamOwners.includes(h as string)).length})` 
                                    : 'Sin opciones disponibles'}
                                </p>
                              </div>
                              {isHeadsDropdownOpen ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
                            </button>
                            
                            {isHeadsDropdownOpen && allHeadsOfCareer.length > 0 && (
                              <div className="p-2 space-y-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800/20">
                                {allHeadsOfCareer.map((head, index) => (
                                  <button
                                    key={index}
                                    onClick={() => toggleOwner(head as string)}
                                    className={cn(
                                      "w-full p-3 rounded-xl flex items-center justify-between border transition text-left",
                                      selectedTeamOwners.includes(head as string)
                                        ? "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800"
                                        : "bg-transparent border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                    )}
                                  >
                                    <div>
                                      <p className={cn(
                                        "text-sm font-bold",
                                        selectedTeamOwners.includes(head as string) ? "text-purple-700 dark:text-purple-400" : "text-slate-800 dark:text-white"
                                      )}>{head as string}</p>
                                      <p className="text-xs text-slate-500">Administrador de Carrera</p>
                                    </div>
                                    <div className={cn(
                                      "w-5 h-5 rounded flex items-center justify-center border",
                                      selectedTeamOwners.includes(head as string) 
                                        ? "bg-purple-600 border-purple-600 text-white" 
                                        : "border-slate-300 dark:border-slate-600 text-transparent"
                                    )}>
                                      <Check size={14} />
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Docentes */}
                        <div>
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Docentes</h4>
                          <div className="space-y-2">
                            {groupTeachers.length > 0 ? (
                              groupTeachers.map((teacher: any, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => toggleOwner(teacher)}
                                  className={cn(
                                    "w-full p-3 rounded-xl flex items-center justify-between border transition text-left shrink-0",
                                    selectedTeamOwners.includes(teacher)
                                      ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                                      : "bg-slate-50 dark:bg-slate-800/50 border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                                  )}
                                >
                                  <div>
                                    <p className={cn(
                                      "text-sm font-bold",
                                      selectedTeamOwners.includes(teacher) ? "text-blue-700 dark:text-blue-400" : "text-slate-800 dark:text-white"
                                    )}>{teacher}</p>
                                    <p className="text-xs text-slate-500">Docente de Materia</p>
                                  </div>
                                  <div className={cn(
                                    "w-5 h-5 rounded flex items-center justify-center border",
                                    selectedTeamOwners.includes(teacher) 
                                      ? "bg-blue-600 border-blue-600 text-white" 
                                      : "border-slate-300 dark:border-slate-600 text-transparent"
                                  )}>
                                    <Check size={14} />
                                  </div>
                                </button>
                              ))
                            ) : (
                              <p className="text-sm text-slate-400 italic">No hay docentes asignados.</p>
                            )}
                          </div>
                        </div>

                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div className="space-y-6">
              <div className="flex bg-white dark:bg-slate-900 rounded-xl p-1 shadow-sm border border-slate-200 dark:border-slate-800 w-fit">
                <button
                  onClick={() => setTeamFilter('pending')}
                  className={cn(
                    "px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200",
                    teamFilter === 'pending' 
                      ? "bg-purple-600 text-white shadow-md" 
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  )}
                >
                  Equipos por Crear
                </button>
                <button
                  onClick={() => setTeamFilter('created')}
                  className={cn(
                    "px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200",
                    teamFilter === 'created' 
                      ? "bg-purple-600 text-white shadow-md" 
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  )}
                >
                  Equipos Creados
                </button>
              </div>

              <ManagementTable 
                key={`teams_groups_${teamFilter}`}
                title={teamFilter === 'pending' ? "Gestión de Equipos por Crear" : "Equipos en MS Teams"} 
                subtitle={teamFilter === 'pending' ? "Selecciona un grupo para registrar su equipo de trabajo nuevo" : "Administra los grupos que ya tienen un equipo en MS Teams"}
                type="group"
                actionLabel={teamFilter === 'pending' ? "Crear Equipo" : undefined}
                onManage={teamFilter === 'pending' ? (group) => setSelectedTeamGroup(group) : undefined}
                onEdit={teamFilter === 'created' ? (group) => setSelectedTeamGroup(group) : undefined}
                onDelete={teamFilter === 'created' ? (group) => handleDeleteTeam(group) : undefined}
                columns={[
                  { key: 'id', label: 'ID Grupo', render: (val) => <span className="font-mono text-[10px] text-slate-400">{String(val).substring(0, 8)}...</span> },
                  { key: 'name', label: 'Nombre del Grupo', render: (val) => <span className="font-bold text-slate-800 dark:text-white">{val}</span> },
                  { 
                    key: 'subjects', 
                    label: 'Materias', 
                    render: (_, item) => {
                      const groupSemesters = String(item.semester).match(/\d+/g)?.map(Number) || [];
                      const groupSubjects = subjects.filter(s => {
                        const sSemesters = String(s.semester).match(/\d+/g)?.map(Number) || [];
                        return groupSemesters.some(sem => sSemesters.includes(sem));
                      });
                      return <span className="text-slate-600 dark:text-slate-300 font-medium">{groupSubjects.length} Materias</span>;
                    } 
                  },
                  { 
                    key: 'teachers', 
                    label: 'Docentes', 
                    render: (_, item) => {
                      const groupSemesters = String(item.semester).match(/\d+/g)?.map(Number) || [];
                      const groupSubjects = subjects.filter(s => {
                        const sSemesters = String(s.semester).match(/\d+/g)?.map(Number) || [];
                        return groupSemesters.some(sem => sSemesters.includes(sem));
                      });
                      const teacherCount = new Set(groupSubjects.map(s => s.teacher_id).filter(Boolean)).size;
                      return <span className="text-slate-600 dark:text-slate-300 font-medium">{teacherCount} Docentes</span>;
                    } 
                  },
                  { key: 'studentsCount', label: 'Alumnos', render: (val) => <span className="font-medium text-slate-600 dark:text-slate-400">{val || 0} Inscritos</span> },
                  { key: 'modality', label: 'Modalidad', render: (val) => (
                    <span className={cn(
                      "px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                      val === 'Escolarizada' ? "bg-blue-50 text-blue-600" : 
                      val === 'Ejecutiva' ? "bg-amber-50 text-amber-600" : 
                      "bg-purple-50 text-purple-600"
                    )}>
                      {val}
                    </span>
                  )},
                ]}
                data={groups.filter(g => teamFilter === 'pending' ? !g.team_created : !!g.team_created)}
              />
            </div>
          );
        default:
          return <div className="flex items-center justify-center h-64 text-slate-400 italic">Módulo en desarrollo...</div>;
      }
    } else if (role === 'DOCENTE') {
      if (managedGroup) {
        return (
          <GroupManagement 
            groupName={managedGroup.name} 
            subjectName={managedGroup.subject} 
            groupId={managedGroup.groupId || managedGroup.originalGroup?.id || managedGroup.id}
            subjectId={managedGroup.subjectId || managedGroup.originalSubject?.id}
            ms_team_id={managedGroup.originalGroup?.ms_team_id || managedGroup.ms_team_id}
            onBack={() => setManagedGroup(null)} 
            students={managedGroup.students || []}
            onSaveSuccess={fetchData}
            showToast={showToast}
          />
        );
      }

      switch (activeTab) {
        case 'dashboard':
          const teacherStats = {
            totalGroups: teacherGroups.length,
            gradedGroups: teacherGroups.filter(g => g.captureProgress === 100).length,
            pendingGroups: teacherGroups.filter(g => g.captureProgress < 100).length
          };
          return (
            <TeacherDashboard 
              onManageGroup={(group) => setManagedGroup(group)} 
              onCaptureGrades={() => handleTabChange('grades')}
              groups={teacherGroups}
              stats={teacherStats}
            />
          );
        case 'my-groups':
          return (
            <ManagementTable 
              key="my-groups"
              title="Mis Grupos Asignados" 
              subtitle="Consulta y gestiona tus grupos del cuatrimestre actual"
              type="group"
              columns={[
                { key: 'name', label: 'Grupo', render: (val) => <span className="font-bold text-slate-800 dark:text-white">{val}</span> },
                { key: 'subject', label: 'Materia', render: (val) => <span className="text-slate-600 dark:text-slate-300">{val}</span> },
                { key: 'semester', label: 'Cuatrimestre', render: (val) => <span className="text-slate-600 dark:text-slate-300">{val}</span> },
                { key: 'studentsCount', label: 'Alumnos', render: (val) => <span className="text-slate-600 dark:text-slate-300">{val}</span> },
              ]}
              data={teacherGroups}
              onManage={(group) => setManagedGroup(group)}
              actionLabel="Gestionar Grupo"
            />
          );
        case 'grades':
          return (
            <GradeCapture 
              onBack={() => handleTabChange('dashboard')}
              groups={teacherGroups}
              students={students}
              careers={careers}
              onSaveSuccess={fetchData}
            />
          );
        default:
          return <div className="flex items-center justify-center h-64 text-slate-400 italic">Módulo en desarrollo...</div>;
      }
    } else {
      // COBRANZA ROLE
      switch (activeTab) {
        case 'dashboard':
        case 'debts':
          return <CollectionsDashboard debts={debts} onImport={async (data) => await handleImport(data, 'debt')} />;
        default:
          return <div className="flex items-center justify-center h-64 text-slate-400 italic">Módulo en desarrollo...</div>;
      }
    }
  };

  return (
    <Layout 
      user={currentUser!} 
      activeTab={activeTab} 
      setActiveTab={handleTabChange} 
      onLogout={handleLogout}
      notifications={history}
      isSupabaseConfigured={isSupabaseConfigured}
    >
      {renderContent()}
      
      {/* Subject Evaluation Modal */}
      {selectedSubject && (
        <SubjectEvaluationModal 
          subject={selectedSubject}
          onClose={() => setSelectedSubject(null)}
          rubrics={selectedSubjectData?.rubrics || []}
          evaluations={selectedSubjectData?.evaluations || []}
          students={selectedSubjectData?.students || []}
          subjectCriteria={selectedSubjectData?.subjectCriteria || []}
          loading={loadingSubjectData}
        />
      )}

      {/* Assign Subject Modal */}
      {selectedTeacherForAssignment && (
        <AssignSubjectModal 
          teacher={selectedTeacherForAssignment}
          subjects={subjects}
          careers={careers}
          onClose={() => setSelectedTeacherForAssignment(null)}
          onAssign={handleAssignSubject}
          onSync={handleSyncEnrollments}
        />
      )}

      {/* Group Details Modal */}
      {selectedGroupDetails && (
        <GroupDetailsModal
          group={selectedGroupDetails}
          students={students}
          subjects={subjects}
          onClose={() => setSelectedGroupDetails(null)}
        />
      )}

      {/* Management Modal */}
      <ManagementModal 
        isOpen={isManagementModalOpen}
        onClose={() => {
          setIsManagementModalOpen(false);
          setEditingItem(null);
        }}
        type={managementModalType}
        onSave={handleSaveManagement}
        initialData={editingItem}
        careers={careers}
        groups={groups}
        teachers={teachers}
      />

      <ConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        onClose={() => setDeleteConfirmation(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDelete}
        title="Confirmar eliminación"
        message="¿Estás seguro de que deseas eliminar este registro permanentemente? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        isDestructive={true}
      />

      <ConfirmationModal
        isOpen={unassignConfirmation.isOpen}
        onClose={() => setUnassignConfirmation(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmUnassign}
        title="Desasignar Materia"
        message={`¿Estás seguro de que deseas quitar esta materia al profesor ${unassignConfirmation.teacherName}?`}
        confirmText="Desasignar"
        isDestructive={true}
      />

      {viewSubjectDetails && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setViewSubjectDetails(null)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[32px] shadow-2xl overflow-hidden flex flex-col transition-colors"
          >
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Detalles de la Materia</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Información general</p>
              </div>
              <button onClick={() => setViewSubjectDetails(null)} className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-full text-slate-400 dark:hover:text-slate-200 transition-all">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Código</label>
                <p className="text-sm font-mono font-bold text-slate-800 dark:text-white">{viewSubjectDetails.code}</p>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Nombre de la Materia</label>
                <p className="text-base font-bold text-slate-800 dark:text-white">{viewSubjectDetails.name}</p>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Carrera</label>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  {viewSubjectDetails.isCommonCore ? 'Tronco Común (Todas)' : (viewSubjectDetails.career || 'No asignada')}
                </p>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Cuatrimestre</label>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{viewSubjectDetails.semester}° Cuatrimestre</p>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Alumnos Inscritos</label>
                <p className="text-sm font-bold text-blue-600 dark:text-blue-400">
                  {viewSubjectDetails.studentsCount || 0} Alumnos
                </p>
              </div>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Docente Asignado</label>
                <select
                  value={teachers.find(t => t.name === viewSubjectDetails.teacher)?.id || ''}
                  onChange={(e) => handleDirectAssignTeacher(viewSubjectDetails.id, e.target.value)}
                  className={cn(
                    "w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 transition-all",
                    viewSubjectDetails.teacher ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-red-500 dark:text-red-400"
                  )}
                >
                  <option value="">-- Sin docente asignado --</option>
                  {teachers.map(teacher => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button 
                onClick={() => setViewSubjectDetails(null)}
                className="px-6 py-2 text-sm font-bold text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {showTeamsStepper && stepperData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md relative"
          >
            <button 
              onClick={() => setShowTeamsStepper(false)}
              className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
            <TeamsCreationStepper 
              {...stepperData}
              onSuccess={(teamId) => {
                // Update local state when finished
                setGroups(prev => prev.map(g => g.id === stepperData.groupId ? { 
                  ...g, 
                  team_created: true, 
                  ms_team_id: teamId,
                  teams_id: teamId,
                  is_teams_active: true
                } : g));
                
                if (selectedTeamGroup?.id === stepperData.groupId) {
                  setSelectedTeamGroup(prev => prev ? { 
                    ...prev, 
                    team_created: true, 
                    ms_team_id: teamId,
                    teams_id: teamId,
                    is_teams_active: true
                  } : null);
                }
                setTimeout(() => setShowTeamsStepper(false), 2000);
              }}
            />
          </motion.div>
        </div>
      )}

      <Toast 
        message={notification.message}
        type={notification.type}
        isOpen={notification.isOpen}
        onClose={() => setNotification(prev => ({ ...prev, isOpen: false }))}
      />
    </Layout>
  );
}
