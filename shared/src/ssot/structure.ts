import {TableStructure} from '../types/types';

export const structure = {
  tables: {
    students: {
      columns:{
        numero_libreta   :{type: 'string', label: "Número de Libreta / Student ID:", required: true, readonlyOnEdit: true, pattern: '^\\d{1,4}/\\d{2}$', patternMessage: 'must match pattern NNNN/YY (1-4 digit number, slash, 2-digit year; leading zeros optional on the number)', normalize: { pattern: '^0+(?=\\d)', replacement: '' }},
        dni              :{type: 'string', label: 'DNI / ID Number:', required: true, pattern: '^\\d{7,8}$', patternMessage: 'must be 7 or 8 digits'},
        first_name       :{type: 'string', label: 'Nombre / First Name:', required: true, min: 2},
        last_name        :{type: 'string', label: 'Apellido / Last Name:', required: true, min: 2},
        email            :{type: 'string', label: 'Email:', input: 'email', nullable: true, pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$', patternMessage: 'must be a valid email address'},
        enrollment_date  :{type: 'string', label: 'Fecha de Inscripción / Enrollment Date:', input: 'date', nullable: true, max: 0},
        status           :{type: 'string', label: 'Estado / Status:', input: 'select', nullable: true, options: [
          { value: 'active', label: 'Activo / Active' },
          { value: 'graduated', label: 'Graduado / Graduated' },
          { value: 'interrupted', label: 'Interrumpido / Interrupted' },
        ]},
      },
      pk: 'numero_libreta',
      uiName: 'Student',
      title: 'Alumnos / Students',
      addButtonLabel: 'Agregar Alumno / Add Student'
    } satisfies TableStructure,
    subjects: {
      columns:{
        cod_mat     :{type: 'string', label: 'Código / Code:', required: true, readonlyOnEdit: true},
        name        :{type: 'string', label: 'Nombre / Name:', required: true},
        description :{type: 'string', label: 'Descripción / Description:', input: 'textarea', nullable: true},
        credits     :{type: 'number', label: 'Créditos / Credits:', input: 'number', nullable: true, integer: true, min: 1},
        department  :{type: 'string', label: 'Departamento / Department:', nullable: true},
      },
      pk: 'cod_mat',
      uiName: 'Subject',
      title: 'Materias / Subjects',
      addButtonLabel: 'Agregar Materia / Add Subject'
    } satisfies TableStructure,
    enrollments: {
        pk: ['numero_libreta', 'cod_mat'],
        uiName: 'Enrollment',
        columns: {
          numero_libreta: { type: 'string', label: 'Número de Libreta / Student ID:', required: true, readonlyOnEdit: true, pattern: '^\\d{1,4}/\\d{2}$', patternMessage: 'must match pattern NNNN/YY (1-4 digit number, slash, 2-digit year; leading zeros optional on the number)', normalize: { pattern: '^0+(?=\\d)', replacement: '' } },
          student_name: { type: 'string', label: 'Nombre del Alumno / Student Name:', editable: false },
          cod_mat: { type: 'string', label: 'Código de Materia / Subject Code:', required: true, readonlyOnEdit: true },
          subject_name: { type: 'string', label: 'Nombre de Materia / Subject Name:', editable: false },
          enrollment_date: { type: 'string', label: 'Fecha de Inscripción / Enrollment Date:', input: 'date', required: true },
          grade: { type: 'number', label: 'Nota / Grade:', input: 'number', nullable: true, min: 0, max: 10 },
          status: { type: 'string', label: 'Estado / Status:', input: 'select', nullable: true, options: [
            { value: 'enrolled', label: 'Inscrito / Enrolled' },
            { value: 'completed', label: 'Completado / Completed' },
            { value: 'failed', label: 'Fallido / Failed' },
          ] }
        }
      ,
        title: 'Inscripciones / Enrollments',
        addButtonLabel: 'Agregar Inscripción / Add Enrollment'
      } satisfies TableStructure
  },
  menu: {
    theme:{
      title: "🌙",
      handler: () => {
        try {
          const current = document.body.getAttribute("data-theme");
          if (current === "dark") {
            document.body.setAttribute("data-theme", "light");
          } else {
            document.body.setAttribute("data-theme", "dark");
          }
        } catch (err) {
          console.error("Theme toggle failed:", err);
          alert("Error al cambiar el tema / Error changing theme");
        }
      },
      id: "theme-toggle"
    },
    lenguage: {
      title: "EN/ES",
      handler: () => {
        try {
          alert("Funcionalidad de cambio de idioma no implementada / Language toggle not implemented");
        } catch (err) {
          console.error("Language toggle failed:", err);
          alert("Error al cambiar el idioma / Error changing language");
        }
      },
      id: "language-toggle"
    }
  }
}
