import { Component, OnInit } from '@angular/core';
import { BreadcrumbService } from 'src/app/core/components/breadcrumb/app.breadcrumb.service';
import { EmpresaService } from '../../services/empresas.service';
import { Empresa } from '../../models/empresa';
import { Curso } from '../../models/curso';
import { CursoService } from '../../services/cursos.service';
import { DialogService } from 'primeng/dynamicdialog';
import { EmpresaEgresadoComponent } from '../empresa-egresados/empresa-egresados.component';
import { ConfirmationService, MessageService, PrimeIcons } from 'primeng/api';
import { Mensaje } from 'src/app/core/enums/enums';
import { infoMessage } from 'src/app/core/utils/message-util';
import { CursoEgresadoComponent } from '../curso-egresados/curso-egresados.component';

@Component({
    selector: 'app-bandeja-seguimiento-a-egresados',
    templateUrl: 'bandeja-seguimiento-a-egresados.component.html',
    styleUrls: ['bandeja-seguimiento-a-egresados.component.scss'],
})
export class BandejaSeguimientoAEgresadosComponent implements OnInit {
    loading: boolean;
    empresas: Empresa[] = [
        {
            id: 1,
            nombre: 'Empresa A',
            ubicacion: 'Ciudad A',
            cargo: 'Cargo A',
            jefeDirecto: 'Jefe A',
            telefono: '123-456-7890',
            correo: 'correoA@example.com',
            estado: 'Activo',
        },
        {
            id: 2,
            nombre: 'Empresa B',
            ubicacion: 'Ciudad B',
            cargo: 'Cargo B',
            jefeDirecto: 'Jefe B',
            telefono: '987-654-3210',
            correo: 'correoB@example.com',
            estado: 'Inactivo',
        },
    ];

    cursos: Curso[] = [
        {
            id: 1,
            nombre: 'Curso 1',
            orientadoA: 'Estudiantes de Ingeniería',
            fechaInicio: '01/01/2022',
            fechaFin: '15/05/2022',
        },
        {
            id: 2,
            nombre: 'Curso 2',
            orientadoA: 'Estudiantes de Ciencias',
            fechaInicio: '15/02/2022',
            fechaFin: '30/06/2022',
        },
    ];

    constructor(
        private breadcrumbService: BreadcrumbService,
        private empresaService: EmpresaService,
        private cursoService: CursoService,
        private dialogService: DialogService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService
    ) {}

    ngOnInit(): void {
        this.setBreadcrumb();
        this.listEmpresas();
        this.listCursos();
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
            .listEmpresas()
            .subscribe({
                next: (response) =>
                    (this.empresas = response.filter(
                        (d) => d.estado === 'ACTIVO'
                    )),
            })
            .add(() => (this.loading = false));
    }

    listCursos() {
        this.loading = true;
        this.cursoService
            .listCursos()
            .subscribe({
                next: (response) =>
                    (this.cursos = response.filter((d) => d.id !== null)),
            })
            .add(() => (this.loading = false));
    }

    showAddEmpresa() {
        return this.dialogService.open(EmpresaEgresadoComponent, {
            header: 'Agregar empresa',
            height: '60vh',
            width: '40%',
        });
    }

    showUpdateEmpresa(id: number) {
        return this.dialogService.open(EmpresaEgresadoComponent, {
            header: 'Editar empresa',
            height: '60vh',
            width: '40%',
            data: { id: id },
        });
    }

    showAddCurso() {
        return this.dialogService.open(CursoEgresadoComponent, {
            header: 'Agregar curso',
            height: '58vh',
            width: '40%',
        });
    }

    showUpdateCurso(id: number) {
        return this.dialogService.open(CursoEgresadoComponent, {
            header: 'Editar curso',
            height: '58vh',
            width: '40%',
            data: { id: id },
        });
    }

    deleteEmpresa(id: number) {
        this.empresaService.deleteEmpresa(id).subscribe({
            next: () => {
                this.messageService.add(
                    infoMessage(Mensaje.EMPRESA_ELIMINADA_CORRECTAMENTE)
                );
                this.listEmpresas();
            },
        });
    }

    deleteCurso(id: number) {
        this.cursoService.deleteCurso(id).subscribe({
            next: () => {
                this.messageService.add(
                    infoMessage(Mensaje.CURSO_ELIMINADO_CORRECTAMENTE)
                );
                this.listCursos();
            },
        });
    }

    onDelete(event: any, id: number, name: string) {
        this.confirmationService.confirm({
            target: event.target,
            message: Mensaje.CONFIRMAR_ELIMINAR_REGISTRO,
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
