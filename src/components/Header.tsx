import MenuIcon from "../assets/Menu.svg";
import LogoSalas from "../assets/LogoSalas.svg";

interface HeaderProps {
  onMenuClick?: () => void;
}

const Header = ({ onMenuClick }: HeaderProps) => {
  return (
    <div className="bg-white flex h-14 justify-between items-center px-4 w-full">
      <button type="button" onClick={onMenuClick} aria-label="Abrir menu">
        <img src={MenuIcon} />
      </button>
      <img src={LogoSalas} className="h-8" />
    </div>
  );
};

export default Header;
