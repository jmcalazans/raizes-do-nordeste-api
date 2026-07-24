import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CadastroDto, LoginDto } from './dto';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  async cadastrar(dto: CadastroDto) {
    if (await this.prisma.usuario.findUnique({ where: { email: dto.email.toLowerCase() } }))
      throw new ConflictException('E-mail já cadastrado.');
    const usuario = await this.prisma.usuario.create({ data: {
      nome: dto.nome, email: dto.email.toLowerCase(), senhaHash: await bcrypt.hash(dto.senha, 12),
      role: Role.CLIENTE, consentimentoLgpd: dto.consentimentoLgpd,
      consentimentoEm: dto.consentimentoLgpd ? new Date() : null,
      consentimentos: { create: { finalidade: 'Cadastro, pedidos e programa de fidelização', concedido: dto.consentimentoLgpd } },
    }});
    return { id: usuario.id, nome: usuario.nome, email: usuario.email, role: usuario.role, consentimentoLgpd: usuario.consentimentoLgpd };
  }

  async login(dto: LoginDto) {
    const usuario = await this.prisma.usuario.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (!usuario || !(await bcrypt.compare(dto.senha, usuario.senhaHash)))
      throw new UnauthorizedException('E-mail ou senha inválidos.');
    const accessToken = await this.jwt.signAsync({ sub: usuario.id, email: usuario.email, role: usuario.role });
    return { accessToken, tokenType: 'Bearer', expiresIn: 3600, user: { id: usuario.id, nome: usuario.nome, role: usuario.role } };
  }
}
