import React, { useState } from 'react';
import Button from './Button';
import Input from './Input';
import Select from './Select';
import Modal from './Modal';
import Card from './Card';
import Table from './Table';
import Badge from './Badge';

const DesignSystemDemo: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [selectValue, setSelectValue] = useState('');

  const options = [
    { value: 'option1', label: 'Opção 1' },
    { value: 'option2', label: 'Opção 2' },
    { value: 'option3', label: 'Opção 3' }
  ];

  const tableData = [
    { id: 1, name: 'Produto A', category: 'Categoria 1', price: '$10.00' },
    { id: 2, name: 'Produto B', category: 'Categoria 2', price: '$20.00' },
    { id: 3, name: 'Produto C', category: 'Categoria 1', price: '$15.00' }
  ];

  const tableColumns = [
    { key: 'id', title: 'ID' },
    { key: 'name', title: 'Nome' },
    { key: 'category', title: 'Categoria' },
    { key: 'price', title: 'Preço' }
  ];

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Demonstração do Sistema de Design</h1>

      <Card title="Componentes de Formulário" className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Input
              label="Campo de Texto"
              placeholder="Digite algo..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
          </div>
          <div>
            <Select
              label="Campo de Seleção"
              options={options}
              value={selectValue}
              onChange={(e) => setSelectValue(e.target.value)}
            />
          </div>
        </div>
      </Card>

      <Card title="Botões" className="mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <Button variant="primary">Primário</Button>
          <Button variant="secondary">Secundário</Button>
          <Button variant="danger">Perigo</Button>
          <Button variant="ghost">Fantasma</Button>
          <Button variant="link">Link</Button>
          <Button size="sm">Pequeno</Button>
          <Button size="md">Médio</Button>
          <Button size="lg">Grande</Button>
          <Button isLoading={true}>Carregando</Button>
          <Button fullWidth={false}>Normal</Button>
        </div>
      </Card>

      <Card title="Badges" className="mb-6">
        <div className="flex flex-wrap gap-2">
          <Badge variant="default">Default</Badge>
          <Badge variant="primary">Primary</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="error">Error</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="info">Info</Badge>
          <Badge size="sm">Small</Badge>
          <Badge size="md">Medium</Badge>
          <Badge size="lg">Large</Badge>
        </div>
      </Card>

      <Card title="Tabela" className="mb-6">
        <Table
          columns={tableColumns}
          data={tableData}
          striped={true}
          hoverable={true}
        />
      </Card>

      <Card title="Modal" className="mb-6">
        <Button onClick={() => setIsModalOpen(true)}>
          Abrir Modal
        </Button>
        
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Exemplo de Modal"
          size="md"
        >
          <div className="mt-2">
            <p className="text-sm text-gray-500">
              Este é um exemplo de modal criado com o componente Modal.
            </p>
          </div>
          
          <div className="mt-4 flex justify-end">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Fechar
            </Button>
          </div>
        </Modal>
      </Card>
    </div>
  );
};

export default DesignSystemDemo;