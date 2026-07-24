import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/public.decorator';
import { AuthService } from './auth.service';
import { CadastroDto, LoginDto } from './dto';

@ApiTags('Autenticação')
@Controller('auth')
export class AuthController {
  constructor(private service: AuthService) {}
  @Public() @Post('cadastro') @ApiOperation({ summary: 'Cadastra um usuário' }) cadastrar(@Body() dto: CadastroDto) { return this.service.cadastrar(dto); }
  @Public() @Post('login') @HttpCode(200) @ApiOperation({ summary: 'Autentica e retorna JWT' }) login(@Body() dto: LoginDto) { return this.service.login(dto); }
}
