import { Component, OnInit } from '@angular/core';
import { BreadcrumbService } from 'src/app/core/components/breadcrumb/app.breadcrumb.service';
import { EmpresaService } from '../../services/empresas.service';
import { Empresa } from '../../models/empresa';
import { Curso } from '../../models/curso';
import { CursoService } from '../../services/cursos.service';
import { DialogService } from 'primeng/dynamicdialog';
import { EmpresaEgresadoComponent } from '../empresa-egresados/empresa-egresados.component';
import { ConfirmationService, MessageService, PrimeIcons } from 'primeng/api';
import { Aviso } from 'src/app/core/enums/enums';
import { infoMessage } from 'src/app/core/utils/message-util';
import { CursoEgresadoComponent } from '../curso-egresados/curso-egresados.component';
import { Estudiante } from 'src/app/modules/gestion-estudiantes/models/estudiante';
import { BuscadorEstudiantesComponent } from 'src/app/shared/components/buscador-estudiantes/buscador-estudiantes.component';
import { SolicitudService } from 'src/app/modules/examen-de-valoracion/services/solicitud.service';
import { LocalStorageService } from 'src/app/shared/services/localstorage.service';

@Component({
    selector: 'app-bandeja-seguimiento-a-egresados',
    templateUrl: 'bandeja-seguimiento-a-egresados.component.html',
    styleUrls: ['bandeja-seguimiento-a-egresados.component.scss'],
})
export class BandejaSeguimientoAEgresadosComponent implements OnInit {
    empresas: Empresa[] = [];
    cursos: Curso[] = [];

    estudianteSeleccionado: Estudiante;

    loading: boolean;

    constructor(
        private breadcrumbService: BreadcrumbService,
        private empresaService: EmpresaService,
        private localStorageService: LocalStorageService,
        private cursoService: CursoService,
        private dialogService: DialogService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService
    ) {}

    ngOnInit(): void {
        this.loadData();
        this.setBreadcrumb();
    }

    loadData() {
        const estudiante = this.localStorageService.getLocalStorage('est');

        if (estudiante) {
            this.estudianteSeleccionado = estudiante;
            this.listCursos();
            this.listEmpresas();
        }
    }

    mapEstudianteLabel(estudiante: any) {
        return {
            id: estudiante.id,
            codigo: estudiante.codigo,
            nombre: estudiante.nombre,
            apellido: estudiante.apellido,
            // identificacion: estudiante.persona.identificacion,
            // periodoIngreso: estudiante.informacionMaestria.periodoIngreso,
            // cohorte: estudiante.informacionMaestria.cohorte,
        };
    }

    limpiarEstudiante() {
        this.estudianteSeleccionado = null;
        this.localStorageService.clearLocalStorage('est');
    }

    showBuscadorEstudiantes() {
        return this.dialogService.open(BuscadorEstudiantesComponent, {
            header: 'Seleccionar estudiante',
            width: '60%',
        });
    }

    onSeleccionarEstudiante() {
        this.limpiarEstudiante();
        const ref = this.showBuscadorEstudiantes();
        ref.onClose.subscribe({
            next: (response) => {
                if (response) {
                    this.estudianteSeleccionado =
                        this.mapEstudianteLabel(response);
                    this.localStorageService.saveLocalStorage(
                        this.mapEstudianteLabel(response),
                        'est'
                    );
                    this.listCursos();
                    this.listEmpresas();
                }
            },
            error: (e) => console.error(e),
        });
    }

    setBreadcrumb() {
        this.breadcrumbService.setItems([
            { label: 'Trabajos de Grado' },
            { label: 'Seguimiento A Egresados' },
        ]);
    }

    listEmpresas() {
        this.loading = true;
        this.empresaService
            .listEmpresas(this.estudianteSeleccionado.id)
            .subscribe({
                next: (response) => {
                    if (response) {
                        this.empresas = response.filter((d) => d.id !== null);
                    }
                },
                error: (e) => console.error(e),
            })
            .add(() => (this.loading = false));
    }

    listCursos() {
        this.loading = true;
        this.cursoService
            .listCursos(this.estudianteSeleccionado.id)
            .subscribe({
                next: (response) => {
                    if (response) {
                        this.cursos = response.filter((d) => d.id !== null);
                    }
                },
                error: (e) => console.error(e),
            })
            .add(() => (this.loading = false));
    }

    showAddEmpresa() {
        const ref = this.dialogService.open(EmpresaEgresadoComponent, {
            header: 'Agregar empresa',
            height: '60vh',
            width: '40%',
            data: { estudianteId: this.estudianteSeleccionado.id },
        });
        ref.onClose.subscribe(() => {
            this.listEmpresas();
        });
    }

    showUpdateEmpresa(id: number) {
        const ref = this.dialogService.open(EmpresaEgresadoComponent, {
            header: 'Editar empresa',
            height: '60vh',
            width: '40%',
            data: {
                empresaId: id,
                estudianteId: this.estudianteSeleccionado.id,
            },
        });
        ref.onClose.subscribe(() => {
            this.listEmpresas();
        });
    }

    showAddCurso() {
        const ref = this.dialogService.open(CursoEgresadoComponent, {
            header: 'Agregar curso',
            height: '58vh',
            width: '40%',
            data: { estudianteId: this.estudianteSeleccionado.id },
        });
        ref.onClose.subscribe(() => {
            this.listCursos();
        });
    }

    showUpdateCurso(id: number) {
        const ref = this.dialogService.open(CursoEgresadoComponent, {
            header: 'Editar curso',
            height: '58vh',
            width: '40%',
            data: { cursoId: id, estudianteId: this.estudianteSeleccionado.id },
        });
        ref.onClose.subscribe(() => {
            this.listCursos();
        });
    }

    deleteEmpresa(id: number) {
        this.empresaService.deleteEmpresa(id).subscribe({
            next: () => {
                this.messageService.add(
                    infoMessage(Aviso.EMPRESA_ELIMINADA_CORRECTAMENTE)
                );
                this.listEmpresas();
            },
        });
    }

    deleteCurso(id: number) {
        this.cursoService.deleteCurso(id).subscribe({
            next: () => {
                this.messageService.add(
                    infoMessage(Aviso.CURSO_ELIMINADO_CORRECTAMENTE)
                );
                this.listCursos();
            },
        });
    }

    onDelete(event: any, id: number, name: string) {
        this.confirmationService.confirm({
            target: event.target,
            message: Aviso.CONFIRMAR_ELIMINAR_REGISTRO,
            icon: PrimeIcons.EXCLAMATION_TRIANGLE,
            acceptLabel: 'Si, eliminar',
            rejectLabel: 'No',
            accept: () =>
                name === 'curso'
                    ? this.deleteCurso(id)
                    : this.deleteEmpresa(id),
        });
    }
}
